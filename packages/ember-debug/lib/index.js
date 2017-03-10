import {
  TESTING,
  DEBUG
} from 'ember-environment-flags';
import {
  FEATURES_STRIPPED_TEST
} from 'ember-feature-flags';
import * as FEATURES from 'ember-feature-flags';
import { ENV, environment } from 'ember-environment';
export {
  setDebugFunction,
  deprecate,
  warn,
  debug,
  debugFreeze,
  debugSeal,
  getDebugFunction,
  assert,
  info,
  deprecateFunc,
  runInDebug
} from './debug-handlers';
import {
  setDebugFunction,
  deprecate,
  warn,
  debug
} from './debug-handlers';
import {
  Error as EmberError
} from './error';
import Logger from 'ember-console';

import _deprecate, {
  registerHandler as registerDeprecationHandler,
  deprecateProperty
} from './deprecate';
import _warn, {
  registerHandler as registerWarnHandler
} from './warn';

/**
@module ember
@submodule ember-debug
*/

/**
@class Ember
@public
*/


/**
  Define an assertion that will throw an exception if the condition is not met.

  * In a production build, this method is defined as an empty function (NOP).
  Uses of this method in Ember itself are stripped from the ember.prod.js build.

  ```javascript
  // Test for truthiness
  Ember.assert('Must pass a valid object', obj);

  // Fail unconditionally
  Ember.assert('This code path should never be run');
  ```

  @method assert
  @param {String} desc A description of the assertion. This will become
    the text of the Error thrown if the assertion fails.
  @param {Boolean} test Must be truthy for the assertion to pass. If
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

  * In a production build, this method is defined as an empty function (NOP).
  Uses of this method in Ember itself are stripped from the ember.prod.js build.

  ```javascript
  Ember.debug('I\'m a debug notice!');
  ```

  @method debug
  @param {String} message A debug message to display.
  @public
*/
setDebugFunction('debug', function debug(message) {
  if (DEBUG) {
    Logger.debug(`DEBUG: ${message}`);
  }
});

/**
  Display an info notice.

  * In a production build, this method is defined as an empty function (NOP).
  Uses of this method in Ember itself are stripped from the ember.prod.js build.

  @method info
  @private
*/
setDebugFunction('info', function info() {
  Logger.info.apply(undefined, arguments);
});

/**
  Alias an old, deprecated method with its new counterpart.

  Display a deprecation warning with the provided message and a stack trace
  (Chrome and Firefox only) when the assigned method is called.

  * In a production build, this method is defined as an empty function (NOP).

  ```javascript
  Ember.oldMethod = Ember.deprecateFunc('Please use the new, updated method', Ember.newMethod);
  ```

  @method deprecateFunc
  @param {String} message A description of the deprecation.
  @param {Object} [options] The options object for Ember.deprecate.
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
  Run a function meant for debugging.

  * In a production build, this method is defined as an empty function (NOP).
  Uses of this method in Ember itself are stripped from the ember.prod.js build.

  ```javascript
  Ember.runInDebug(() => {
    Ember.Component.reopen({
      didInsertElement() {
        console.log("I'm happy");
      }
    });
  });
  ```

  @method runInDebug
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

/**
  Will call `Ember.warn()` if ENABLE_OPTIONAL_FEATURES or
  any specific FEATURES flag is truthy.

  This method is called automatically in debug canary builds.

  @private
  @method _warnIfUsingStrippedFeatureFlags
  @return {void}
*/
export function _warnIfUsingStrippedFeatureFlags(FEATURES, knownFeatures, featuresWereStripped) {
  if (featuresWereStripped) {
    warn('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.', !ENV.ENABLE_OPTIONAL_FEATURES, { id: 'ember-debug.feature-flag-with-features-stripped' });

    let keys = Object.keys(FEATURES || {});
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (key === 'isEnabled' || !(key in knownFeatures)) {
        continue;
      }

      warn(`FEATURE["${key}"] is set as enabled, but FEATURE flags are only available in canary builds.`, !FEATURES[key], { id: 'ember-debug.feature-flag-with-features-stripped' });
    }
  }
}

if (!TESTING) {
  let featuresWereStripped = true;

  if (FEATURES_STRIPPED_TEST) {
    featuresWereStripped = false;
  }

  _warnIfUsingStrippedFeatureFlags(FEATURES, ENV.FEATURES, featuresWereStripped);

  // Inform the developer about the Ember Inspector if not installed.
  let isFirefox = environment.isFirefox;
  let isChrome = environment.isChrome;

  if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
    window.addEventListener('load', () => {
      if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
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

/*
  We are transitioning away from `ember.js` to `ember.debug.js` to make
  it much clearer that it is only for local development purposes.

  This flag value is changed by the tooling (by a simple string replacement)
  so that if `ember.js` (which must be output for backwards compat reasons) is
  used a nice helpful warning message will be printed out.
*/
export let runningNonEmberDebugJS = false;
if (runningNonEmberDebugJS) {
  warn('Please use `ember.debug.js` instead of `ember.js` for development and debugging.');
}
