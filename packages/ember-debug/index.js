import { DEBUG } from '@glimmer/env';
import { ENV } from 'ember-environment';
import { isChrome, isFirefox } from 'ember-browser-environment';
import { isTesting } from './lib/testing';
import EmberError from '@ember/error';
import { default as isFeatureEnabled } from './lib/features';
import * as FLAGS from 'ember/features';
let { DEFAULT_FEATURES, FEATURES } = FLAGS;
import _deprecate from './lib/deprecate';
import _warn from './lib/warn';

export { registerHandler as registerWarnHandler } from './lib/warn';
export { registerHandler as registerDeprecationHandler } from './lib/deprecate';
export { default as isFeatureEnabled } from './lib/features';
export { isTesting, setTesting } from './lib/testing';

// These are the default production build versions:
const noop = () => {};

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

let deprecateFunc = function() {
  return arguments[arguments.length - 1];
};

if (DEBUG) {
  setDebugFunction = function(type, callback) {
    switch (type) {
      case 'assert':
        return (assert = callback);
      case 'info':
        return (info = callback);
      case 'warn':
        return (warn = callback);
      case 'debug':
        return (debug = callback);
      case 'deprecate':
        return (deprecate = callback);
      case 'debugSeal':
        return (debugSeal = callback);
      case 'debugFreeze':
        return (debugFreeze = callback);
      case 'runInDebug':
        return (runInDebug = callback);
      case 'deprecateFunc':
        return (deprecateFunc = callback);
    }
  };

  getDebugFunction = function(type) {
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
  /**
    Verify that a certain expectation is met, or throw a exception otherwise.

    This is useful for communicating assumptions in the code to other human
    readers as well as catching bugs that accidentally violates these
    expectations.

    Assertions are removed from production builds, so they can be freely added
    for documentation and debugging purposes without worries of incuring any
    performance penalty. However, because of that, they should not be used for
    checks that could reasonably fail during normal usage. Furthermore, care
    should be taken to avoid accidentally relying on side-effects produced from
    evaluating the condition itself, since the code will not run in production.

    ```javascript
    import { assert } from '@ember/debug';

    // Test for truthiness
    assert('Must pass a string', typeof str === 'string');

    // Fail unconditionally
    assert('This code path should never be run');
    ```

    @method assert
    @static
    @for @ember/debug
    @param {String} description Describes the expectation. This will become the
      text of the Error thrown if the assertion fails.
    @param {Boolean} condition Must be truthy for the assertion to pass. If
      falsy, an exception will be thrown.
    @public
    @since 1.0.0
  */
  setDebugFunction('assert', function assert(desc, test) {
    if (!test) {
      throw new EmberError(`Assertion Failed: ${desc}`);
    }
  });

  /**
    Display a debug notice.

    Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.

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
    /* eslint-disable no-console */
    if (console.debug) {
      console.debug(`DEBUG: ${message}`);
    } else {
      console.log(`DEBUG: ${message}`);
    }
    /* eslint-ensable no-console */
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
   @module @ember/application
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
    import { deprecateFunc } from '@ember/application/deprecations';

    Ember.oldMethod = deprecateFunc('Please use the new, updated method', options, Ember.newMethod);
    ```

    @method deprecateFunc
    @static
    @for @ember/application/deprecations
    @param {String} message A description of the deprecation.
    @param {Object} [options] The options object for `deprecate`.
    @param {Function} func The new function called to replace its deprecated counterpart.
    @return {Function} A new function that wraps the original function with a deprecation warning
    @private
  */
  setDebugFunction('deprecateFunc', function deprecateFunc(...args) {
    if (args.length === 3) {
      let [message, options, func] = args;
      return function() {
        deprecate(message, false, options);
        return func.apply(this, arguments);
      };
    } else {
      let [message, func] = args;
      return function() {
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
    Object.freeze(obj);
  });

  setDebugFunction('deprecate', _deprecate);

  setDebugFunction('warn', _warn);
}

let _warnIfUsingStrippedFeatureFlags;

if (DEBUG && !isTesting()) {
  /**
     Will call `warn()` if ENABLE_OPTIONAL_FEATURES or
     any specific FEATURES flag is truthy.

     This method is called automatically in debug canary builds.

     @private
     @method _warnIfUsingStrippedFeatureFlags
     @return {void}
  */
  _warnIfUsingStrippedFeatureFlags = function _warnIfUsingStrippedFeatureFlags(
    FEATURES,
    knownFeatures,
    featuresWereStripped
  ) {
    if (featuresWereStripped) {
      warn(
        'Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.',
        !ENV.ENABLE_OPTIONAL_FEATURES,
        { id: 'ember-debug.feature-flag-with-features-stripped' }
      );

      let keys = Object.keys(FEATURES || {});
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (key === 'isEnabled' || !(key in knownFeatures)) {
          continue;
        }

        warn(
          `FEATURE["${key}"] is set as enabled, but FEATURE flags are only available in canary builds.`,
          !FEATURES[key],
          { id: 'ember-debug.feature-flag-with-features-stripped' }
        );
      }
    }
  };

  // Complain if they're using FEATURE flags in builds other than canary
  FEATURES['features-stripped-test'] = true;
  let featuresWereStripped = true;

  if (isFeatureEnabled('features-stripped-test')) {
    featuresWereStripped = false;
  }

  delete FEATURES['features-stripped-test'];
  _warnIfUsingStrippedFeatureFlags(ENV.FEATURES, DEFAULT_FEATURES, featuresWereStripped);

  if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
    window.addEventListener(
      'load',
      () => {
        if (
          document.documentElement &&
          document.documentElement.dataset &&
          !document.documentElement.dataset.emberExtension
        ) {
          let downloadURL;

          if (isChrome) {
            downloadURL =
              'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
          } else if (isFirefox) {
            downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
          }

          debug(`For more advanced debugging, install the Ember Inspector from ${downloadURL}`);
        }
      },
      false
    );
  }
}

export {
  assert,
  info,
  warn,
  debug,
  deprecate,
  debugSeal,
  debugFreeze,
  runInDebug,
  deprecateFunc,
  setDebugFunction,
  getDebugFunction,
  _warnIfUsingStrippedFeatureFlags,
};
