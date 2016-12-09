import Ember, { // reexports
  isTesting,
  warn,
  deprecate,
  debug,
  setDebugFunction,
  isFeatureEnabled,
  FEATURES,
  DEFAULT_FEATURES,
  Error as EmberError
} from 'ember-metal';
import { ENV, environment } from 'ember-environment';
import Logger from 'ember-console';

import _deprecate, {
  registerHandler as registerDeprecationHandler
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
    throw new EmberError('Assertion Failed: ' + desc);
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
  Logger.debug('DEBUG: ' + message);
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

      warn('FEATURE["' + key + '"] is set as enabled, but FEATURE flags are only available in canary builds.', !FEATURES[key], { id: 'ember-debug.feature-flag-with-features-stripped' });
    }
  }
}

if (!isTesting()) {
  // Complain if they're using FEATURE flags in builds other than canary
  FEATURES['features-stripped-test'] = true;
  let featuresWereStripped = true;

  if (isFeatureEnabled('features-stripped-test')) {
    featuresWereStripped = false;
  }

  delete FEATURES['features-stripped-test'];
  _warnIfUsingStrippedFeatureFlags(ENV.FEATURES, DEFAULT_FEATURES, featuresWereStripped);

  // Inform the developer about the Ember Inspector if not installed.
  let isFirefox = environment.isFirefox;
  let isChrome = environment.isChrome;

  if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
    window.addEventListener('load', () => {
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
/**
  @public
  @class Ember.Debug
*/
Ember.Debug = { };

/**
  Allows for runtime registration of handler functions that override the default deprecation behavior.
  Deprecations are invoked by calls to [Ember.deprecate](http://emberjs.com/api/classes/Ember.html#method_deprecate).
  The following example demonstrates its usage by registering a handler that throws an error if the
  message contains the word "should", otherwise defers to the default handler.

  ```javascript
  Ember.Debug.registerDeprecationHandler((message, options, next) => {
    if (message.indexOf('should') !== -1) {
      throw new Error(`Deprecation message with should: ${message}`);
    } else {
      // defer to whatever handler was registered before this one
      next(message, options);
    }
  });
  ```

  The handler function takes the following arguments:

  <ul>
    <li> <code>message</code> - The message received from the deprecation call.</li>
    <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
      <ul>
        <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
        <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
      </ul>
    <li> <code>next</code> - A function that calls into the previously registered handler.</li>
  </ul>

  @public
  @static
  @method registerDeprecationHandler
  @param handler {Function} A function to handle deprecation calls.
  @since 2.1.0
*/
Ember.Debug.registerDeprecationHandler = registerDeprecationHandler;
/**
  Allows for runtime registration of handler functions that override the default warning behavior.
  Warnings are invoked by calls made to [Ember.warn](http://emberjs.com/api/classes/Ember.html#method_warn).
  The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
  default warning behavior.

  ```javascript
  // next is not called, so no warnings get the default behavior
  Ember.Debug.registerWarnHandler(() => {});
  ```

  The handler function takes the following arguments:

  <ul>
    <li> <code>message</code> - The message received from the warn call. </li>
    <li> <code>options</code> - An object passed in with the warn call containing additional information including:</li>
      <ul>
        <li> <code>id</code> - An id of the warning in the form of <code>package-name.specific-warning</code>.</li>
      </ul>
    <li> <code>next</code> - A function that calls into the previously registered handler.</li>
  </ul>

  @public
  @static
  @method registerWarnHandler
  @param handler {Function} A function to handle warnings.
  @since 2.1.0
*/
Ember.Debug.registerWarnHandler = registerWarnHandler;

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
