var slice = [].slice,
    helpers = {},
    originalMethods = {},
    injectHelpersCallbacks = [],
    has = {}.hasOwnProperty;

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
    Ember.Test.registerHelper('boot', function(app)) {
      Ember.run(app, app.deferReadiness);
    }
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
    if (has.call(originalMethods, name)) {
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
  }
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
    this.deferReadiness();

    this.Router.reopen({
      location: 'none'
    });
  },

  injectTestHelpers: function() {
    this.testHelpers = {};
    for (var name in helpers) {
      if (has.call(window, name)) {
        originalMethods[name] = window[name];
      }
      this.testHelpers[name] = window[name] = curry(this, helpers[name]);
    }

    for(var i = 0, l = injectHelpersCallbacks.length; i < l; i++) {
      injectHelpersCallbacks[i](this);
    }
  },

  removeTestHelpers: function() {
    for (var name in helpers) {
      if (has.call(originalMethods, name)) {
        window[name] = originalMethods[name];
      } else {
        delete window[name];
      }
      delete this.testHelpers[name];
      delete originalMethods[name];
    }
  }
});
