/**
  Inside Ember-Metal, simply uses the methods from `imports.console`.
  Override this to provide more robust logging functionality.

  @class Logger
  @namespace Ember
  @public
*/
export default {
  /**
   Logs the arguments to the console.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.log('log value of foo:', foo);
    // "log value of foo: 1" will be printed to the console
    ```

   @method log
   @for Ember.Logger
   @param {*} arguments
   @public
  */
  log() { return console.log(...arguments);}, // eslint-disable-line no-console

  /**
   Prints the arguments to the console with a warning icon.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    Ember.Logger.warn('Something happened!');
    // "Something happened!" will be printed to the console with a warning icon.
    ```

   @method warn
   @for Ember.Logger
   @param {*} arguments
   @public
  */
  warn() { return console.warn(...arguments);}, // eslint-disable-line no-console

  /**
   Prints the arguments to the console with an error icon, red text and a stack trace.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    Ember.Logger.error('Danger! Danger!');
    // "Danger! Danger!" will be printed to the console in red text.
    ```

   @method error
   @for Ember.Logger
   @param {*} arguments
   @public
  */
  error() { return console.error(...arguments);}, // eslint-disable-line no-console

  /**
   Logs the arguments to the console.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.info('log value of foo:', foo);
    // "log value of foo: 1" will be printed to the console
    ```

   @method info
   @for Ember.Logger
   @param {*} arguments
   @public
  */
  info() { return console.info(...arguments);}, // eslint-disable-line no-console

  /**
   Logs the arguments to the console in blue text.
   You can pass as many arguments as you want and they will be joined together with a space.

    ```javascript
    var foo = 1;
    Ember.Logger.debug('log value of foo:', foo);
    // "log value of foo: 1" will be printed to the console
    ```

   @method debug
   @for Ember.Logger
   @param {*} arguments
   @public
  */
  debug() {
    return console.debug && console.debug(...arguments) || console.info(...arguments); // eslint-disable-line no-console
  },

  /**
   If the value passed into `Ember.Logger.assert` is not truthy it will throw an error with a stack trace.

    ```javascript
    Ember.Logger.assert(true); // undefined
    Ember.Logger.assert(true === false); // Throws an Assertion failed error.
    Ember.Logger.assert(true === false, 'Something invalid'); // Throws an Assertion failed error with message.
    ```

   @method assert
   @for Ember.Logger
   @param {Boolean} bool Value to test
   @param {String} message Assertion message on failed
   @public
  */
  assert() { return console.assert(...arguments);} // eslint-disable-line no-console
};
