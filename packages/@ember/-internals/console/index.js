import { deprecate } from '@ember/debug';
import { LOGGER } from '@ember/deprecated-features';

// Deliver message that the function is deprecated

const DEPRECATION_MESSAGE = 'Use of Ember.Logger is deprecated. Please use `console` for logging.';
const DEPRECATION_ID = 'ember-console.deprecate-logger';
const DEPRECATION_URL =
  'https://emberjs.com/deprecations/v3.x#toc_use-console-rather-than-ember-logger';
/**
   @module ember
*/

/**
  Inside Ember-Metal, simply uses the methods from `imports.console`.
  Override this to provide more robust logging functionality.

  @class Logger
  @deprecated Use 'console' instead

  @namespace Ember
  @public
*/
let DEPRECATED_LOGGER;

if (LOGGER) {
  DEPRECATED_LOGGER = {
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
    log() {
      deprecate(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL,
      });
      return console.log(...arguments); // eslint-disable-line no-console
    },

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
    warn() {
      deprecate(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL,
      });
      return console.warn(...arguments); // eslint-disable-line no-console
    },

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
    error() {
      deprecate(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL,
      });
      return console.error(...arguments); // eslint-disable-line no-console
    },

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
    info() {
      deprecate(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL,
      });
      return console.info(...arguments); // eslint-disable-line no-console
    },

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
      deprecate(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL,
      });
      /* eslint-disable no-console */
      if (console.debug) {
        return console.debug(...arguments);
      }
      return console.info(...arguments);
      /* eslint-enable no-console */
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
    assert() {
      deprecate(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL,
      });
      return console.assert(...arguments); // eslint-disable-line no-console
    },
  };
}

export default DEPRECATED_LOGGER;
