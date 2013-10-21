/**
  @module ember
  @submodule ember-testing
 */
var slice = [].slice,
    helpers = {},
    originalMethods = {},
    injectHelpersCallbacks = [],
    Router = requireModule('router');

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
  registerHelper: function(name, helperMethod) {
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
  */
  registerAsyncHelper: function(name, helperMethod) {
    helpers[name] = {
      method: helperMethod,
      meta: { wait: true }
    };
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
    delete Ember.Test.Promise.prototype[name];
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
    return new Ember.Test.Promise(resolver);
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
  adapter: null,

  /**
    Replacement for `Ember.RSVP.resolve`
    The only difference is this uses
    and instance of `Ember.Test.Promise`

    @public
    @method resolve
    @param {Mixed} The value to resolve
  */
  resolve: function(val) {
    return Ember.Test.promise(function(resolve) {
      return resolve(val);
    });
  },

  /**
   @public

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
  */
  registerWaiter: function(context, callback) {
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
  */
  unregisterWaiter: function(context, callback) {
    var pair;
    if (!this.waiters) { return; }
    if (arguments.length === 1) {
      callback = context;
      context = null;
    }
    pair = [context, callback];
    this.waiters = Ember.A(this.waiters.filter(function(elt) {
      return Ember.compare(elt, pair)!==0;
    }));
  }
};

function helper(app, name) {
  var fn = helpers[name].method,
      meta = helpers[name].meta;

  return function() {
    var args = slice.call(arguments),
        lastPromise = Ember.Test.lastPromise;

    args.unshift(app);

    // some helpers are not async and
    // need to return a value immediately.
    // example: `find`
    if (!meta.wait) {
      return fn.apply(app, args);
    }

    if (!lastPromise) {
      // It's the first async helper in current context
      lastPromise = fn.apply(app, args);
    } else {
      // wait for last helper's promise to resolve
      // and then execute
      run(function() {
        lastPromise = Ember.Test.resolve(lastPromise).then(function() {
          return fn.apply(app, args);
        });
      });
    }

    return lastPromise;
  };
}

function run(fn) {
  if (!Ember.run.currentRunLoop) {
    Ember.run(fn);
  } else {
    fn();
  }
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
      this.testHelpers[name] = window[name] = helper(this, name);
      protoWrap(Ember.Test.Promise.prototype, name, helper(this, name), helpers[name].meta.wait);
    }

    for(var i = 0, l = injectHelpersCallbacks.length; i < l; i++) {
      injectHelpersCallbacks[i](this);
    }

    Ember.RSVP.configure('onerror', onerror);
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
    Ember.RSVP.configure('onerror', null);
  }

});

// This method is no longer needed
// But still here for backwards compatibility
// of helper chaining
function protoWrap(proto, name, callback, isAsync) {
  proto[name] = function() {
    var args = arguments;
    if (isAsync) {
      return callback.apply(this, args);
    } else {
      return this.then(function() {
        return callback.apply(this, args);
      });
    }
  };
}

Ember.Test.Promise = function() {
  Ember.RSVP.Promise.apply(this, arguments);
  Ember.Test.lastPromise = this;
};

Ember.Test.Promise.prototype = Ember.create(Ember.RSVP.Promise.prototype);
Ember.Test.Promise.prototype.constructor = Ember.Test.Promise;

// Patch `then` to isolate async methods
// specifically `Ember.Test.lastPromise`
var originalThen = Ember.RSVP.Promise.prototype.then;
Ember.Test.Promise.prototype.then = function(onSuccess, onFailure) {
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
// 4. Restore `Ember.Test.lastPromise` to original value
function isolate(fn, val) {
  var value, lastPromise;

  // Reset lastPromise for nested helpers
  Ember.Test.lastPromise = null;

  value = fn.call(null, val);

  lastPromise = Ember.Test.lastPromise;

  // If the method returned a promise
  // return that promise. If not,
  // return the last async helper's promise
  if ((value && (value instanceof Ember.Test.Promise)) || !lastPromise) {
    return value;
  } else {
    run(function() {
      lastPromise = Ember.Test.resolve(lastPromise).then(function() {
        return value;
      });
    });
    return lastPromise;
  }
}


function onerror(error) {
  if (!(error instanceof Router.TransitionAborted)) {
    Ember.Test.adapter.exception(error);
  }
}
