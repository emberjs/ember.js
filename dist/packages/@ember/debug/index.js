import { isChrome, isFirefox } from '@ember/-internals/browser-environment';
import { DEBUG } from '@glimmer/env';
import _deprecate from './lib/deprecate';
import { isTesting } from './lib/testing';
import _warn from './lib/warn';
export { registerHandler as registerWarnHandler } from './lib/warn';
export { registerHandler as registerDeprecationHandler } from './lib/deprecate';
export { default as inspect } from './lib/inspect';
export { isTesting, setTesting } from './lib/testing';
export { default as captureRenderTree } from './lib/capture-render-tree';
// These are the default production build versions:
const noop = () => {};
// SAFETY: these casts are just straight-up lies, but the point is that they do
// not do anything in production builds.
let assert = noop;
let info = noop;
let warn = noop;
let debug = noop;
let deprecate = noop;
let debugSeal = noop;
let debugFreeze = noop;
let runInDebug = noop;
let setDebugFunction = noop;
let getDebugFunction = noop;
let deprecateFunc = function () {
  return arguments[arguments.length - 1];
};
if (DEBUG) {
  setDebugFunction = function (type, callback) {
    switch (type) {
      case 'assert':
        return assert = callback;
      case 'info':
        return info = callback;
      case 'warn':
        return warn = callback;
      case 'debug':
        return debug = callback;
      case 'deprecate':
        return deprecate = callback;
      case 'debugSeal':
        return debugSeal = callback;
      case 'debugFreeze':
        return debugFreeze = callback;
      case 'runInDebug':
        return runInDebug = callback;
      case 'deprecateFunc':
        return deprecateFunc = callback;
    }
  };
  getDebugFunction = function (type) {
    switch (type) {
      case 'assert':
        return assert;
      case 'info':
        return info;
      case 'warn':
        return warn;
      case 'debug':
        return debug;
      case 'deprecate':
        return deprecate;
      case 'debugSeal':
        return debugSeal;
      case 'debugFreeze':
        return debugFreeze;
      case 'runInDebug':
        return runInDebug;
      case 'deprecateFunc':
        return deprecateFunc;
    }
  };
}
/**
@module @ember/debug
*/
if (DEBUG) {
  // eslint-disable-next-line no-inner-declarations
  function assert(desc, test) {
    if (!test) {
      throw new Error(`Assertion Failed: ${desc}`);
    }
  }
  setDebugFunction('assert', assert);
  /**
    Display a debug notice.
       Calls to this function are not invoked in production builds.
       ```javascript
    import { debug } from '@ember/debug';
       debug('I\'m a debug notice!');
    ```
       @method debug
    @for @ember/debug
    @static
    @param {String} message A debug message to display.
    @public
  */
  setDebugFunction('debug', function debug(message) {
    console.debug(`DEBUG: ${message}`); /* eslint-disable-line no-console */
  });
  /**
    Display an info notice.
       Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.
       @method info
    @private
  */
  setDebugFunction('info', function info() {
    console.info(...arguments); /* eslint-disable-line no-console */
  });
  /**
   @module @ember/debug
   @public
  */
  /**
    Alias an old, deprecated method with its new counterpart.
       Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only) when the assigned method is called.
       Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.
       ```javascript
    import { deprecateFunc } from '@ember/debug';
       Ember.oldMethod = deprecateFunc('Please use the new, updated method', options, Ember.newMethod);
    ```
       @method deprecateFunc
    @static
    @for @ember/debug
    @param {String} message A description of the deprecation.
    @param {Object} [options] The options object for `deprecate`.
    @param {Function} func The new function called to replace its deprecated counterpart.
    @return {Function} A new function that wraps the original function with a deprecation warning
    @private
  */
  setDebugFunction('deprecateFunc', function deprecateFunc(...args) {
    if (args.length === 3) {
      let [message, options, func] = args;
      return function (...args) {
        deprecate(message, false, options);
        return func.apply(this, args);
      };
    } else {
      let [message, func] = args;
      return function () {
        deprecate(message);
        return func.apply(this, arguments);
      };
    }
  });
  /**
   @module @ember/debug
   @public
  */
  /**
    Run a function meant for debugging.
       Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.
       ```javascript
    import Component from '@ember/component';
    import { runInDebug } from '@ember/debug';
       runInDebug(() => {
      Component.reopen({
        didInsertElement() {
          console.log("I'm happy");
        }
      });
    });
    ```
       @method runInDebug
    @for @ember/debug
    @static
    @param {Function} func The function to be executed.
    @since 1.5.0
    @public
  */
  setDebugFunction('runInDebug', function runInDebug(func) {
    func();
  });
  setDebugFunction('debugSeal', function debugSeal(obj) {
    Object.seal(obj);
  });
  setDebugFunction('debugFreeze', function debugFreeze(obj) {
    // re-freezing an already frozen object introduces a significant
    // performance penalty on Chrome (tested through 59).
    //
    // See: https://bugs.chromium.org/p/v8/issues/detail?id=6450
    if (!Object.isFrozen(obj)) {
      Object.freeze(obj);
    }
  });
  setDebugFunction('deprecate', _deprecate);
  setDebugFunction('warn', _warn);
}
let _warnIfUsingStrippedFeatureFlags;
if (DEBUG && !isTesting()) {
  if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
    window.addEventListener('load', () => {
      if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset['emberExtension']) {
        let downloadURL;
        if (isChrome) {
          downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
        } else if (isFirefox) {
          downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
        }
        debug(`For more advanced debugging, install the Ember Inspector from ${downloadURL}`);
      }
    }, false);
  }
}
export { assert, info, warn, debug, deprecate, debugSeal, debugFreeze, runInDebug, deprecateFunc, setDebugFunction, getDebugFunction, _warnIfUsingStrippedFeatureFlags };