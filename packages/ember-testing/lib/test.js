/**
  @module ember
  @submodule ember-testing
 */
var slice = [].slice,
    helpers = {},
    originalMethods = {},
    injectHelpersCallbacks = [];

/**
  This is a container for an assortment of testing related functionality:

  * Choose your default test adapter (for your framework of choice).
  * Register/Unregister additional test helpers.
  * Setup callbacks to be fired when the test helpers are injected into
    your application.
  
  @class Test
  @namespace Ember
*/
Ember.Test = {

  /**
    `registerHelper` is used to register a test helper that will be injected
    when `App.injectTestHelpers` is called.

    The helper method will always be called with the current Application as
    the first parameter.

    For example:
    ```javascript
      Ember.Test.registerHelper('boot', function(app) {
        Ember.run(app, app.deferReadiness);
      });
    ```

    This helper can later be called without arguments because it will be
    called with `app` as the first parameter.

    ```javascript
      App = Ember.Application.create();
      App.injectTestHelpers();
      boot();
    ```

    Whenever you register a helper that performs async operations, make sure
    you `return wait();` at the end of the helper.

    If an async helper also needs to return a value, pass it to the `wait`
    helper as a first argument:
    `return wait(val);`

    @public
    @method registerHelper
    @param {String} name The name of the helper method to add.
    @param {Function} helperMethod
  */
  registerHelper: function(name, helperMethod) {
    helpers[name] = helperMethod;
  },
  /**
    Remove a previously added helper method.

    Example:
    ```
    Ember.Test.unregisterHelper('wait');
    ```

    @public
    @method unregisterHelper
    @param {String} name The helper to remove.
  */
  unregisterHelper: function(name) {
    delete helpers[name];
    if (originalMethods[name]) {
      window[name] = originalMethods[name];
    }
    delete originalMethods[name];
  },

  /**
    Used to register callbacks to be fired whenever `App.injectTestHelpers`
    is called.

    The callback will receive the current application as an argument.

    Example:
    ```
    Ember.Test.onInjectHelpers(function() {
      Ember.$(document).ajaxStart(function() {
        Test.pendingAjaxRequests++;
      });

      Ember.$(document).ajaxStop(function() {
        Test.pendingAjaxRequests--;
      });
    });
    ```

    @public
    @method onInjectHelpers
    @param {Function} callback The function to be called.
  */
  onInjectHelpers: function(callback) {
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
  */
  promise: function(resolver) {
    var promise = new Ember.RSVP.Promise(resolver);
    var thenable = {
      chained: false
    };
    thenable.then = function(onSuccess, onFailure) {
      var thenPromise, nextPromise;
      thenable.chained = true;
      thenPromise = promise.then(onSuccess, onFailure);
      // this is to ensure all downstream fulfillment
      // handlers are wrapped in the error handling
      nextPromise = Ember.Test.promise(function(resolve) {
        resolve(thenPromise);
      });
      thenPromise.then(null, function(reason) {
        // ensure this is the last promise in the chain
        // if not, ignore and the exception will propagate
        // this prevents the same error from being fired multiple times
        if (!nextPromise.chained) {
          Ember.Test.adapter.exception(reason);
        }
      });
      return nextPromise;
    };
    return thenable;
  },

  /**
   Used to allow ember-testing to communicate with a specific testing
   framework.

   You can manually set it before calling `App.setupForTesting()`.

   Example:
   ```
   Ember.Test.adapter = MyCustomAdapter.create()
   ```

   If you do not set it, ember-testing will default to `Ember.Test.QUnitAdapter`.

   @public
   @property adapter
   @type {Class} The adapter to be used.
   @default Ember.Test.QUnitAdapter
  */
  adapter: null
};

function curry(app, fn) {
  return function() {
    var args = slice.call(arguments);
    args.unshift(app);
    return fn.apply(app, args);
  };
}

Ember.Application.reopen({
  /**
    @property testHelpers
    @type {Object}
    @default {}
  */
  testHelpers: {},

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
  */
  setupForTesting: function() {
    Ember.testing = true;

    this.deferReadiness();

    this.Router.reopen({
      location: 'none'
    });

    // if adapter is not manually set default to QUnit
    if (!Ember.Test.adapter) {
       Ember.Test.adapter = Ember.Test.QUnitAdapter.create();
    }
  },

  /**
    This injects the test helpers into the window's scope. If a function of the
    same name has already been defined it will be cached (so that it can be reset
    if the helper is removed with `unregisterHelper` or `removeTestHelpers`).

   Any callbacks registered with `onInjectHelpers` will be called once the
   helpers have been injected.

  Example:
  ```
  App.injectTestHelpers();
  ```

    @method injectTestHelpers
  */
  injectTestHelpers: function() {
    this.testHelpers = {};
    for (var name in helpers) {
      originalMethods[name] = window[name];
      this.testHelpers[name] = window[name] = curry(this, helpers[name]);
    }

    for(var i = 0, l = injectHelpersCallbacks.length; i < l; i++) {
      injectHelpersCallbacks[i](this);
    }
  },

  /**
    This removes all helpers that have been registered, and resets and functions
    that were overridden by the helpers.

    Example:
    ```
    App.removeTestHelpers();
    ```

    @public
    @method removeTestHelpers
  */
  removeTestHelpers: function() {
    for (var name in helpers) {
      window[name] = originalMethods[name];
      delete this.testHelpers[name];
      delete originalMethods[name];
    }
  }
});
