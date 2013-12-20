require('ember-metal/core');
require('ember-metal/error');

function consoleMethod(name) {
  var consoleObj, logToConsole;
  if (Ember.imports.console) {
    consoleObj = Ember.imports.console;
  } else if (typeof console !== 'undefined') {
    consoleObj = console;
  }

  var method = typeof consoleObj === 'object' ? consoleObj[name] : null;

  if (method) {
    // Older IE doesn't support apply, but Chrome needs it
    if (method.apply) {
      logToConsole = function() {
        method.apply(consoleObj, arguments);
      };
      logToConsole.displayName = 'console.' + name;
      return logToConsole;
    } else {
      return function() {
        var message = Array.prototype.join.call(arguments, ', ');
        method(message);
      };
    }
  }
}

function assertPolyfill(test, message) {
  if (!test) {
    try {
      // attempt to preserve the stack
      throw new Ember.Error("assertion failed: " + message);
    } catch(error) {
      setTimeout(function() {
        throw error;
      }, 0);
    }
  }
}

/**
  Inside Ember-Metal, simply uses the methods from `imports.console`.
  Override this to provide more robust logging functionality.

  @class Logger
  @namespace Ember
*/
Ember.Logger = {
  /**
   Logs the arguments to the console.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.log('log value of foo:', foo); // "log value of foo: 1" will be printed to the console
    ```

   @method log
   @for Ember.Logger
   @param {*} arguments
  */
  log:   consoleMethod('log')   || Ember.K,

  /**
   Prints the arguments to the console with a warning icon.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    Ember.Logger.warn('Something happened!'); // "Something happened!" will be printed to the console with a warning icon.
    ```

   @method warn
   @for Ember.Logger
   @param {*} arguments
  */
  warn:  consoleMethod('warn')  || Ember.K,

  /**
   Prints the arguments to the console with an error icon, red text and a stack trace.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    Ember.Logger.error('Danger! Danger!'); // "Danger! Danger!" will be printed to the console in red text.
    ```

   @method error
   @for Ember.Logger
   @param {*} arguments
  */
  error: consoleMethod('error') || Ember.K,

  /**
   Logs the arguments to the console.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.info('log value of foo:', foo); // "log value of foo: 1" will be printed to the console
    ```

   @method info
   @for Ember.Logger
   @param {*} arguments
  */
  info:  consoleMethod('info')  || Ember.K,

  /**
   Logs the arguments to the console in blue text.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.debug('log value of foo:', foo); // "log value of foo: 1" will be printed to the console
    ```

   @method debug
   @for Ember.Logger
   @param {*} arguments
  */
  debug: consoleMethod('debug') || consoleMethod('info') || Ember.K,

  /**
   If the value passed into `Ember.Logger.assert` is not truthy it will throw an error with a stack trace.

    ```javascript
    Ember.Logger.assert(true); // undefined
    Ember.Logger.assert(true === false); // Throws an Assertion failed error.
    ```

   @method assert
   @for Ember.Logger
   @param {Boolean} bool Value to test
  */
  assert: consoleMethod('assert') || assertPolyfill
};

