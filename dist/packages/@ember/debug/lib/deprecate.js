import { ENV } from '@ember/-internals/environment';
import { DEBUG } from '@glimmer/env';
import { assert } from '../index';
import { invoke, registerHandler as genericRegisterHandler } from './handlers';
/**
 @module @ember/debug
 @public
*/
/**
  Allows for runtime registration of handler functions that override the default deprecation behavior.
  Deprecations are invoked by calls to [@ember/debug/deprecate](/ember/release/classes/@ember%2Fdebug/methods/deprecate?anchor=deprecate).
  The following example demonstrates its usage by registering a handler that throws an error if the
  message contains the word "should", otherwise defers to the default handler.

  ```javascript
  import { registerDeprecationHandler } from '@ember/debug';

  registerDeprecationHandler((message, options, next) => {
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
  @for @ember/debug
  @param handler {Function} A function to handle deprecation calls.
  @since 2.1.0
*/
let registerHandler = () => {};
let missingOptionsDeprecation;
let missingOptionsIdDeprecation;
let missingOptionDeprecation = () => '';
let deprecate = () => {};
if (DEBUG) {
  registerHandler = function registerHandler(handler) {
    genericRegisterHandler('deprecate', handler);
  };
  let formatMessage = function formatMessage(_message, options) {
    let message = _message;
    if (options?.id) {
      message = message + ` [deprecation id: ${options.id}]`;
    }
    if (options?.until) {
      message = message + ` This will be removed in ${options.for} ${options.until}.`;
    }
    if (options?.url) {
      message += ` See ${options.url} for more details.`;
    }
    return message;
  };
  registerHandler(function logDeprecationToConsole(message, options) {
    let updatedMessage = formatMessage(message, options);
    console.warn(`DEPRECATION: ${updatedMessage}`); // eslint-disable-line no-console
  });

  let captureErrorForStack;
  if (new Error().stack) {
    captureErrorForStack = () => new Error();
  } else {
    captureErrorForStack = () => {
      try {
        __fail__.fail();
        return;
      } catch (e) {
        return e;
      }
    };
  }
  registerHandler(function logDeprecationStackTrace(message, options, next) {
    if (ENV.LOG_STACKTRACE_ON_DEPRECATION) {
      let stackStr = '';
      let error = captureErrorForStack();
      let stack;
      if (error instanceof Error) {
        if (error.stack) {
          if (error['arguments']) {
            // Chrome
            stack = error.stack.replace(/^\s+at\s+/gm, '').replace(/^([^(]+?)([\n$])/gm, '{anonymous}($1)$2').replace(/^Object.<anonymous>\s*\(([^)]+)\)/gm, '{anonymous}($1)').split('\n');
            stack.shift();
          } else {
            // Firefox
            stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
          }
          stackStr = `\n    ${stack.slice(2).join('\n    ')}`;
        }
      }
      let updatedMessage = formatMessage(message, options);
      console.warn(`DEPRECATION: ${updatedMessage}${stackStr}`); // eslint-disable-line no-console
    } else {
      next(message, options);
    }
  });
  registerHandler(function raiseOnDeprecation(message, options, next) {
    if (ENV.RAISE_ON_DEPRECATION) {
      let updatedMessage = formatMessage(message);
      throw new Error(updatedMessage);
    } else {
      next(message, options);
    }
  });
  missingOptionsDeprecation = 'When calling `deprecate` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include `id` and `until` properties.';
  missingOptionsIdDeprecation = 'When calling `deprecate` you must provide `id` in options.';
  missingOptionDeprecation = (id, missingOption) => {
    return `When calling \`deprecate\` you must provide \`${missingOption}\` in options. Missing options.${missingOption} in "${id}" deprecation`;
  };
  /**
   @module @ember/debug
   @public
   */
  /**
    Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only).
       Ember itself leverages [Semantic Versioning](https://semver.org) to aid
    projects in keeping up with changes to the framework. Before any
    functionality or API is removed, it first flows linearly through a
    deprecation staging process. The staging process currently contains two
    stages: available and enabled.
       Deprecations are initially released into the 'available' stage.
    Deprecations will stay in this stage until the replacement API has been
    marked as a recommended practice via the RFC process and the addon
    ecosystem has generally adopted the change.
       Once a deprecation meets the above criteria, it will move into the
    'enabled' stage where it will remain until the functionality or API is
    eventually removed.
       For application and addon developers, "available" deprecations are not
    urgent and "enabled" deprecations require action.
       * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
       ```javascript
    import { deprecate } from '@ember/debug';
       deprecate(
      'Use of `assign` has been deprecated. Please use `Object.assign` or the spread operator instead.',
      false,
      {
        id: 'ember-polyfills.deprecate-assign',
        until: '5.0.0',
        url: 'https://deprecations.emberjs.com/v4.x/#toc_ember-polyfills-deprecate-assign',
        for: 'ember-source',
        since: {
          available: '4.0.0',
          enabled: '4.0.0',
        },
      }
    );
    ```
       @method deprecate
    @for @ember/debug
    @param {String} message A description of the deprecation.
    @param {Boolean} test A boolean. If falsy, the deprecation will be displayed.
    @param {Object} options
    @param {String} options.id A unique id for this deprecation. The id can be
      used by Ember debugging tools to change the behavior (raise, log or silence)
      for that specific deprecation. The id should be namespaced by dots, e.g.
      "view.helper.select".
    @param {string} options.until The version of Ember when this deprecation
      warning will be removed.
    @param {String} options.for A namespace for the deprecation, usually the package name
    @param {Object} options.since Describes when the deprecation became available and enabled.
    @param {String} [options.url] An optional url to the transition guide on the
          emberjs.com website.
    @static
    @public
    @since 1.0.0
  */
  deprecate = function deprecate(message, test, options) {
    assert(missingOptionsDeprecation, Boolean(options && (options.id || options.until)));
    assert(missingOptionsIdDeprecation, Boolean(options.id));
    assert(missingOptionDeprecation(options.id, 'until'), Boolean(options.until));
    assert(missingOptionDeprecation(options.id, 'for'), Boolean(options.for));
    assert(missingOptionDeprecation(options.id, 'since'), Boolean(options.since));
    invoke('deprecate', message, test, options);
  };
}
export default deprecate;
export { registerHandler, missingOptionsDeprecation, missingOptionsIdDeprecation, missingOptionDeprecation };