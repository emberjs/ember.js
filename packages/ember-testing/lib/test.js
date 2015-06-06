import Ember from "ember-metal/core";
import emberRun from "ember-metal/run_loop";
import create from 'ember-metal/platform/create';
import RSVP from "ember-runtime/ext/rsvp";
import setupForTesting from "ember-testing/setup_for_testing";
import EmberApplication from "ember-application/system/application";

/**
  @module ember
  @submodule ember-testing
*/
var helpers = {};
var injectHelpersCallbacks = [];

/**
  This is a container for an assortment of testing related functionality:

  * Choose your default test adapter (for your framework of choice).
  * Register/Unregister additional test helpers.
  * Setup callbacks to be fired when the test helpers are injected into
    your application.

  @class Test
  @namespace Ember
  @public
*/
var Test = {
  /**
    Hash containing all known test helpers.

    @property _helpers
    @private
    @since 1.7.0
  */
  _helpers: helpers,

  /**
    `registerHelper` is used to register a test helper that will be injected
    when `App.injectTestHelpers` is called.

    The helper method will always be called with the current Application as
    the first parameter.

    For example:

    ```javascript
    Ember.Test.registerHelper('boot', function(app) {
      Ember.run(app, app.advanceReadiness);
    });
    ```

    This helper can later be called without arguments because it will be
    called with `app` as the first parameter.

    ```javascript
    App = Ember.Application.create();
    App.injectTestHelpers();
    boot();
    ```

    @public
    @method registerHelper
    @param {String} name The name of the helper method to add.
    @param {Function} helperMethod
    @param options {Object}
  */
  registerHelper(name, helperMethod) {
    helpers[name] = {
      method: helperMethod,
      meta: { wait: false }
    };
  },

  /**
    `registerAsyncHelper` is used to register an async test helper that will be injected
    when `App.injectTestHelpers` is called.

    The helper method will always be called with the current Application as
    the first parameter.

    For example:

    ```javascript
    Ember.Test.registerAsyncHelper('boot', function(app) {
      Ember.run(app, app.advanceReadiness);
    });
    ```

    The advantage of an async helper is that it will not run
    until the last async helper has completed.  All async helpers
    after it will wait for it complete before running.


    For example:

    ```javascript
    Ember.Test.registerAsyncHelper('deletePost', function(app, postId) {
      click('.delete-' + postId);
    });

    // ... in your test
    visit('/post/2');
    deletePost(2);
    visit('/post/3');
    deletePost(3);
    ```

    @public
    @method registerAsyncHelper
    @param {String} name The name of the helper method to add.
    @param {Function} helperMethod
    @since 1.2.0
  */
  registerAsyncHelper(name, helperMethod) {
    helpers[name] = {
      method: helperMethod,
      meta: { wait: true }
    };
  },

  /**
    Remove a previously added helper method.

    Example:

    ```javascript
    Ember.Test.unregisterHelper('wait');
    ```

    @public
    @method unregisterHelper
    @param {String} name The helper to remove.
  */
  unregisterHelper(name) {
    delete helpers[name];
    delete Test.Promise.prototype[name];
  },

  /**
    Used to register callbacks to be fired whenever `App.injectTestHelpers`
    is called.

    The callback will receive the current application as an argument.

    Example:

    ```javascript
    Ember.Test.onInjectHelpers(function() {
      Ember.$(document).ajaxSend(function() {
        Test.pendingAjaxRequests++;
      });

      Ember.$(document).ajaxComplete(function() {
        Test.pendingAjaxRequests--;
      });
    });
    ```

    @public
    @method onInjectHelpers
    @param {Function} callback The function to be called.
  */
  onInjectHelpers(callback) {
    injectHelpersCallbacks.push(callback);
  },

  /**
    This returns a thenable tailored for testing.  It catches failed
    `onSuccess` callbacks and invokes the `Ember.Test.adapter.exception`
    callback in the last chained then.

    This method should be returned by async helpers such as `wait`.

    @public
    @method promise
    @param {Function} resolver The function used to resolve the promise.
    @param {String} label An optional string for identifying the promise.
  */
  promise(resolver, label) {
    var fullLabel = `Ember.Test.promise: ${label || "<Unknown Promise>"}`;
    return new Test.Promise(resolver, fullLabel);
  },

  /**
   Used to allow ember-testing to communicate with a specific testing
   framework.

   You can manually set it before calling `App.setupForTesting()`.

   Example:

   ```javascript
   Ember.Test.adapter = MyCustomAdapter.create()
   ```

   If you do not set it, ember-testing will default to `Ember.Test.QUnitAdapter`.

   @public
   @property adapter
   @type {Class} The adapter to be used.
   @default Ember.Test.QUnitAdapter
  */
  adapter: null,

  /**
    Replacement for `Ember.RSVP.resolve`
    The only difference is this uses
    an instance of `Ember.Test.Promise`

    @public
    @method resolve
    @param {Mixed} The value to resolve
    @since 1.2.0
  */
  resolve(val) {
    return Test.promise(function(resolve) {
      return resolve(val);
    });
  },

  /**
     This allows ember-testing to play nicely with other asynchronous
     events, such as an application that is waiting for a CSS3
     transition or an IndexDB transaction.

     For example:

     ```javascript
     Ember.Test.registerWaiter(function() {
       return myPendingTransactions() == 0;
     });
     ```
     The `context` argument allows you to optionally specify the `this`
     with which your callback will be invoked.

     For example:

     ```javascript
     Ember.Test.registerWaiter(MyDB, MyDB.hasPendingTransactions);
     ```

     @public
     @method registerWaiter
     @param {Object} context (optional)
     @param {Function} callback
     @since 1.2.0
  */
  registerWaiter(context, callback) {
    if (arguments.length === 1) {
      callback = context;
      context = null;
    }
    if (!this.waiters) {
      this.waiters = Ember.A();
    }
    this.waiters.push([context, callback]);
  },
  /**
     `unregisterWaiter` is used to unregister a callback that was
     registered with `registerWaiter`.

     @public
     @method unregisterWaiter
     @param {Object} context (optional)
     @param {Function} callback
     @since 1.2.0
  */
  unregisterWaiter(context, callback) {
    if (!this.waiters) { return; }
    if (arguments.length === 1) {
      callback = context;
      context = null;
    }
    this.waiters = Ember.A(this.waiters.filter(function(elt) {
      return !(elt[0] === context && elt[1] === callback);
    }));
  }
};

function helper(app, name) {
  var fn = helpers[name].method;
  var meta = helpers[name].meta;

  return function(...args) {
    var lastPromise;

    args.unshift(app);

    // some helpers are not async and
    // need to return a value immediately.
    // example: `find`
    if (!meta.wait) {
      return fn.apply(app, args);
    }

    lastPromise = run(function() {
      return Test.resolve(Test.lastPromise);
    });

    // wait for last helper's promise to resolve and then
    // execute. To be safe, we need to tell the adapter we're going
    // asynchronous here, because fn may not be invoked before we
    // return.
    Test.adapter.asyncStart();
    return lastPromise.then(function() {
      return fn.apply(app, args);
    }).finally(function() {
      Test.adapter.asyncEnd();
    });
  };
}

function run(fn) {
  if (!emberRun.currentRunLoop) {
    return emberRun(fn);
  } else {
    return fn();
  }
}

EmberApplication.reopen({
  /**
   This property contains the testing helpers for the current application. These
   are created once you call `injectTestHelpers` on your `Ember.Application`
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
    with your testing framework).

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

    this.Router.reopen({
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

    this.testHelpers = {};
    for (var name in helpers) {
      this.originalMethods[name] = this.helperContainer[name];
      this.testHelpers[name] = this.helperContainer[name] = helper(this, name);
      protoWrap(Test.Promise.prototype, name, helper(this, name), helpers[name].meta.wait);
    }

    for (var i = 0, l = injectHelpersCallbacks.length; i < l; i++) {
      injectHelpersCallbacks[i](this);
    }
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
    if (!this.helperContainer) { return; }

    for (var name in helpers) {
      this.helperContainer[name] = this.originalMethods[name];
      delete this.testHelpers[name];
      delete this.originalMethods[name];
    }
  }
});

// This method is no longer needed
// But still here for backwards compatibility
// of helper chaining
function protoWrap(proto, name, callback, isAsync) {
  proto[name] = function(...args) {
    if (isAsync) {
      return callback.apply(this, args);
    } else {
      return this.then(function() {
        return callback.apply(this, args);
      });
    }
  };
}

Test.Promise = function() {
  RSVP.Promise.apply(this, arguments);
  Test.lastPromise = this;
};

Test.Promise.prototype = create(RSVP.Promise.prototype);
Test.Promise.prototype.constructor = Test.Promise;
Test.Promise.resolve = Test.resolve;

// Patch `then` to isolate async methods
// specifically `Ember.Test.lastPromise`
var originalThen = RSVP.Promise.prototype.then;
Test.Promise.prototype.then = function(onSuccess, onFailure) {
  return originalThen.call(this, function(val) {
    return isolate(onSuccess, val);
  }, onFailure);
};

// This method isolates nested async methods
// so that they don't conflict with other last promises.
//
// 1. Set `Ember.Test.lastPromise` to null
// 2. Invoke method
// 3. Return the last promise created during method
function isolate(fn, val) {
  var value, lastPromise;

  // Reset lastPromise for nested helpers
  Test.lastPromise = null;

  value = fn(val);

  lastPromise = Test.lastPromise;
  Test.lastPromise = null;

  // If the method returned a promise
  // return that promise. If not,
  // return the last async helper's promise
  if ((value && (value instanceof Test.Promise)) || !lastPromise) {
    return value;
  } else {
    return run(function() {
      return Test.resolve(lastPromise).then(function() {
        return value;
      });
    });
  }
}

export default Test;
