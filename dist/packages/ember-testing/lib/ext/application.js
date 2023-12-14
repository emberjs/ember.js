import EmberApplication from '@ember/application';
import setupForTesting from '../setup_for_testing';
import { helpers } from '../test/helpers';
import TestPromise, { resolve, getLastPromise } from '../test/promise';
import run from '../test/run';
import { invokeInjectHelpersCallbacks } from '../test/on_inject_helpers';
import { asyncStart, asyncEnd } from '../test/adapter';
import { assert } from '@ember/debug';
EmberApplication.reopen({
  /**
   This property contains the testing helpers for the current application. These
   are created once you call `injectTestHelpers` on your `Application`
   instance. The included helpers are also available on the `window` object by
   default, but can be used from this object on the individual application also.
       @property testHelpers
    @type {Object}
    @default {}
    @public
  */
  testHelpers: {},
  /**
   This property will contain the original methods that were registered
   on the `helperContainer` before `injectTestHelpers` is called.
      When `removeTestHelpers` is called, these methods are restored to the
   `helperContainer`.
       @property originalMethods
    @type {Object}
    @default {}
    @private
    @since 1.3.0
  */
  originalMethods: {},
  /**
  This property indicates whether or not this application is currently in
  testing mode. This is set when `setupForTesting` is called on the current
  application.
     @property testing
  @type {Boolean}
  @default false
  @since 1.3.0
  @public
  */
  testing: false,
  /**
    This hook defers the readiness of the application, so that you can start
    the app when your tests are ready to run. It also sets the router's
    location to 'none', so that the window's location will not be modified
    (preventing both accidental leaking of state between tests and interference
    with your testing framework). `setupForTesting` should only be called after
    setting a custom `router` class (for example `App.Router = Router.extend(`).
       Example:
       ```
    App.setupForTesting();
    ```
       @method setupForTesting
    @public
  */
  setupForTesting() {
    setupForTesting();
    this.testing = true;
    this.resolveRegistration('router:main').reopen({
      location: 'none'
    });
  },
  /**
    This will be used as the container to inject the test helpers into. By
    default the helpers are injected into `window`.
       @property helperContainer
    @type {Object} The object to be used for test helpers.
    @default window
    @since 1.2.0
    @private
  */
  helperContainer: null,
  /**
    This injects the test helpers into the `helperContainer` object. If an object is provided
    it will be used as the helperContainer. If `helperContainer` is not set it will default
    to `window`. If a function of the same name has already been defined it will be cached
    (so that it can be reset if the helper is removed with `unregisterHelper` or
    `removeTestHelpers`).
       Any callbacks registered with `onInjectHelpers` will be called once the
    helpers have been injected.
       Example:
    ```
    App.injectTestHelpers();
    ```
       @method injectTestHelpers
    @public
  */
  injectTestHelpers(helperContainer) {
    if (helperContainer) {
      this.helperContainer = helperContainer;
    } else {
      this.helperContainer = window;
    }
    this.reopen({
      willDestroy() {
        this._super(...arguments);
        this.removeTestHelpers();
      }
    });
    this.testHelpers = {};
    for (let name in helpers) {
      // SAFETY: It is safe to access a property on an object
      this.originalMethods[name] = this.helperContainer[name];
      // SAFETY: It is not quite as safe to do this, but it _seems_ to be ok.
      this.testHelpers[name] = this.helperContainer[name] = helper(this, name);
      // SAFETY: We checked that it exists
      protoWrap(TestPromise.prototype, name, helper(this, name), helpers[name].meta.wait);
    }
    invokeInjectHelpersCallbacks(this);
  },
  /**
    This removes all helpers that have been registered, and resets and functions
    that were overridden by the helpers.
       Example:
       ```javascript
    App.removeTestHelpers();
    ```
       @public
    @method removeTestHelpers
  */
  removeTestHelpers() {
    if (!this.helperContainer) {
      return;
    }
    for (let name in helpers) {
      this.helperContainer[name] = this.originalMethods[name];
      // SAFETY: This is a weird thing, but it's not technically unsafe here.
      delete TestPromise.prototype[name];
      delete this.testHelpers[name];
      delete this.originalMethods[name];
    }
  }
});
// This method is no longer needed
// But still here for backwards compatibility
// of helper chaining
function protoWrap(proto, name, callback, isAsync) {
  // SAFETY: This isn't entirely safe, but it _seems_ to be ok.
  proto[name] = function (...args) {
    if (isAsync) {
      return callback.apply(this, args);
    } else {
      // SAFETY: This is not actually safe.
      return this.then(function () {
        return callback.apply(this, args);
      });
    }
  };
}
function helper(app, name) {
  let helper = helpers[name];
  assert(`[BUG] Missing helper: ${name}`, helper);
  let fn = helper.method;
  let meta = helper.meta;
  if (!meta.wait) {
    return (...args) => fn.apply(app, [app, ...args]);
  }
  return (...args) => {
    let lastPromise = run(() => resolve(getLastPromise()));
    // wait for last helper's promise to resolve and then
    // execute. To be safe, we need to tell the adapter we're going
    // asynchronous here, because fn may not be invoked before we
    // return.
    asyncStart();
    return lastPromise.then(() => fn.apply(app, [app, ...args])).finally(asyncEnd);
  };
}