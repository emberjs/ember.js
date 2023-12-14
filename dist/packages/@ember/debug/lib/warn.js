import { DEBUG } from '@glimmer/env';
import { assert } from '../index';
import { invoke, registerHandler as genericRegisterHandler } from './handlers';
let registerHandler = () => {};
let warn = () => {};
let missingOptionsDeprecation;
let missingOptionsIdDeprecation;
/**
@module @ember/debug
*/
if (DEBUG) {
  /**
    Allows for runtime registration of handler functions that override the default warning behavior.
    Warnings are invoked by calls made to [@ember/debug/warn](/ember/release/classes/@ember%2Fdebug/methods/warn?anchor=warn).
    The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
    default warning behavior.
       ```javascript
    import { registerWarnHandler } from '@ember/debug';
       // next is not called, so no warnings get the default behavior
    registerWarnHandler(() => {});
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
    @for @ember/debug
    @param handler {Function} A function to handle warnings.
    @since 2.1.0
  */
  registerHandler = function registerHandler(handler) {
    genericRegisterHandler('warn', handler);
  };
  registerHandler(function logWarning(message) {
    /* eslint-disable no-console */
    console.warn(`WARNING: ${message}`);
    /* eslint-enable no-console */
  });

  missingOptionsDeprecation = 'When calling `warn` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include an `id` property.';
  missingOptionsIdDeprecation = 'When calling `warn` you must provide `id` in options.';
  /**
    Display a warning with the provided message.
       * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
       ```javascript
    import { warn } from '@ember/debug';
    import tomsterCount from './tomster-counter'; // a module in my project
       // Log a warning if we have more than 3 tomsters
    warn('Too many tomsters!', tomsterCount <= 3, {
      id: 'ember-debug.too-many-tomsters'
    });
    ```
       @method warn
    @for @ember/debug
    @static
    @param {String} message A warning to display.
    @param {Boolean} test An optional boolean. If falsy, the warning
      will be displayed.
    @param {Object} options An object that can be used to pass a unique
      `id` for this warning.  The `id` can be used by Ember debugging tools
      to change the behavior (raise, log, or silence) for that specific warning.
      The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
    @public
    @since 1.0.0
  */
  warn = function warn(message, test, options) {
    if (arguments.length === 2 && typeof test === 'object') {
      options = test;
      test = false;
    }
    assert(missingOptionsDeprecation, Boolean(options));
    assert(missingOptionsIdDeprecation, Boolean(options && options.id));
    // SAFETY: we checked this by way of the `arguments` check above.
    invoke('warn', message, test, options);
  };
}
export default warn;
export { registerHandler, missingOptionsIdDeprecation, missingOptionsDeprecation };