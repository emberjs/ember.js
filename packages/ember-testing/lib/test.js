var slice = [].slice,
    helpers = {},
    originalMethods = {},
    injectHelpersCallbacks = [];

/**
  @class Test
  @namespace Ember
*/
Ember.Test = {

  /**
    @public

    `registerHelper` is used to register a
    test helper that will be injected when
    `App.injectTestHelpers` is called.

    The helper method will always be called
    with the current Application as the first
    parameter.

    For example:
    ```javascript
    Ember.Test.registerHelper('boot', function(app) {
      Ember.run(app, app.deferReadiness);
    });
    ```

    This helper can later be called without arguments
    because it will be called with `app` as the
    first parameter.

    ```javascript
      App = Ember.Application.create();
      App.injectTestHelpers();
      boot();
    ```

    Whenever you register a helper that
    performs async operations,
    make sure you `return wait();` at the
    end of the helper.

    If an async helper also needs to return a value,
    pass it to the `wait` helper as a first argument:
    `return wait(val);`

    @method registerHelper
    @param name {String}
    @param helperMethod {Function}
  */
  registerHelper: function(name, helperMethod) {
    helpers[name] = helperMethod;
  },
  /**
    @public
    @method unregisterHelper
    @param name {String}
  */
  unregisterHelper: function(name) {
    delete helpers[name];
    if (originalMethods[name]) {
      window[name] = originalMethods[name];
    }
    delete originalMethods[name];
  },

  /**
    @public

    Used to register callbacks to be fired
    whenever `App.injectTestHelpers` is called

    The callback will receive the current application
    as an argument.

    @method unregisterHelper
    @param name {String}
  */
  onInjectHelpers: function(callback) {
    injectHelpersCallbacks.push(callback);
  },

  /**
    @public

    This returns a thenable tailored
    for testing.  It catches failed
    `onSuccess` callbacks and invokes
    the `Ember.Test.adapter.exception`
    callback in the last chained then.

    This method should be returned
    by async helpers such as `wait`.

    @method promise
    @param resolver {Function}
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
   @public

   Used to allow ember-testing
   to communicate with a specific
   testing framework.

   You can manually set it before calling
   `App.setupForTesting()`.

   Example:
   'Ember.Test.adapter = MyCustomAdapter.create()'

   If you do not set it, ember-testing
   will default to `Ember.Test.QUnitAdapter`.
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
  testHelpers: {},

  setupForTesting: function() {
    Ember.testing = true;

    this.deferReadiness();

    this.Router.reopen({
      location: 'none'
    });

   // if adapter is not manually set
    // default to QUnit
    if (!Ember.Test.adapter) {
       Ember.Test.adapter = Ember.Test.QUnitAdapter.create();
    }
  },

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

  removeTestHelpers: function() {
    for (var name in helpers) {
      window[name] = originalMethods[name];
      delete this.testHelpers[name];
      delete originalMethods[name];
    }
  }
});
