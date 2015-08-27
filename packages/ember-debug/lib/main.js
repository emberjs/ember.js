import Ember from 'ember-metal/core';
import {
  warn,
  deprecate,
  debug,
  setDebugFunction
} from 'ember-metal/debug';
import isEnabled, { FEATURES } from 'ember-metal/features';
import EmberError from 'ember-metal/error';
import Logger from 'ember-metal/logger';
import environment from 'ember-metal/environment';
import _deprecate, {
  registerHandler as registerDeprecationHandler
} from 'ember-debug/deprecate';
import _warn, {
  registerHandler as registerWarnHandler
} from 'ember-debug/warn';
import isPlainFunction from 'ember-debug/is-plain-function';

/**
@module ember
@submodule ember-debug
*/

/**
@class Ember
@public
*/


/**
  Define an assertion that will throw an exception if the condition is not
  met. Ember build tools will remove any calls to `Ember.assert()` when
  doing a production build. Example:

  ```javascript
  // Test for truthiness
  Ember.assert('Must pass a valid object', obj);

  // Fail unconditionally
  Ember.assert('This code path should never be run');
  ```

  @method assert
  @param {String} desc A description of the assertion. This will become
    the text of the Error thrown if the assertion fails.
  @param {Boolean|Function} test Must be truthy for the assertion to pass. If
    falsy, an exception will be thrown. If this is a function, it will be executed and
    its return value will be used as condition.
  @public
*/
setDebugFunction('assert', function assert(desc, test) {
  var throwAssertion;

  if (isPlainFunction(test)) {
    throwAssertion = !test();
  } else {
    throwAssertion = !test;
  }

  if (throwAssertion) {
    throw new EmberError('Assertion Failed: ' + desc);
  }
});

/**
  Display a debug notice. Ember build tools will remove any calls to
  `Ember.debug()` when doing a production build.

  ```javascript
  Ember.debug('I\'m a debug notice!');
  ```

  @method debug
  @param {String} message A debug message to display.
  @public
*/
setDebugFunction('debug', function debug(message) {
  Logger.debug('DEBUG: ' + message);
});

/**
  Display an info notice.

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

  Ember build tools will not remove calls to `Ember.deprecateFunc()`, though
  no warnings will be shown in production.

  ```javascript
  Ember.oldMethod = Ember.deprecateFunc('Please use the new, updated method', Ember.newMethod);
  ```

  @method deprecateFunc
  @param {String} message A description of the deprecation.
  @param {Object} [options] The options object for Ember.deprecate.
  @param {Function} func The new function called to replace its deprecated counterpart.
  @return {Function} a new function that wrapped the original function with a deprecation warning
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
  Run a function meant for debugging. Ember build tools will remove any calls to
  `Ember.runInDebug()` when doing a production build.

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

setDebugFunction('deprecate', _deprecate);
setDebugFunction('warn', _warn);
/**
  Will call `Ember.warn()` if ENABLE_ALL_FEATURES, ENABLE_OPTIONAL_FEATURES, or
  any specific FEATURES flag is truthy.

  This method is called automatically in debug canary builds.

  @private
  @method _warnIfUsingStrippedFeatureFlags
  @return {void}
*/
export function _warnIfUsingStrippedFeatureFlags(FEATURES, featuresWereStripped) {
  if (featuresWereStripped) {
    warn('Ember.ENV.ENABLE_ALL_FEATURES is only available in canary builds.', !Ember.ENV.ENABLE_ALL_FEATURES, { id: 'ember-debug.feature-flag-with-features-stripped' });
    warn('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.', !Ember.ENV.ENABLE_OPTIONAL_FEATURES, { id: 'ember-debug.feature-flag-with-features-stripped' });

    for (var key in FEATURES) {
      if (FEATURES.hasOwnProperty(key) && key !== 'isEnabled') {
        warn('FEATURE["' + key + '"] is set as enabled, but FEATURE flags are only available in canary builds.', !FEATURES[key], { id: 'ember-debug.feature-flag-with-features-stripped' });
      }
    }
  }
}

if (!Ember.testing) {
  // Complain if they're using FEATURE flags in builds other than canary
  FEATURES['features-stripped-test'] = true;
  var featuresWereStripped = true;

  if (isEnabled('features-stripped-test')) {
    featuresWereStripped = false;
  }

  delete FEATURES['features-stripped-test'];
  _warnIfUsingStrippedFeatureFlags(Ember.ENV.FEATURES, featuresWereStripped);

  // Inform the developer about the Ember Inspector if not installed.
  var isFirefox = environment.isFirefox;
  var isChrome = environment.isChrome;

  if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
    window.addEventListener('load', function() {
      if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
        var downloadURL;

        if (isChrome) {
          downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
        } else if (isFirefox) {
          downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
        }

        debug('For more advanced debugging, install the Ember Inspector from ' + downloadURL);
      }
    }, false);
  }
}

Ember.Debug = { };

if (isEnabled('ember-debug-handlers')) {
  Ember.Debug.registerDeprecationHandler = registerDeprecationHandler;
  Ember.Debug.registerWarnHandler = registerWarnHandler;
}
/*
  We are transitioning away from `ember.js` to `ember.debug.js` to make
  it much clearer that it is only for local development purposes.

  This flag value is changed by the tooling (by a simple string replacement)
  so that if `ember.js` (which must be output for backwards compat reasons) is
  used a nice helpful warning message will be printed out.
*/
export var runningNonEmberDebugJS = false;
if (runningNonEmberDebugJS) {
  warn('Please use `ember.debug.js` instead of `ember.js` for development and debugging.');
}
