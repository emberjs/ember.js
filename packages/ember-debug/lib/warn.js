import Logger from 'ember-console';
import deprecate from './deprecate';
import { registerHandler as genericRegisterHandler, invoke } from './handlers';

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
export function registerHandler(handler) {
  genericRegisterHandler('warn', handler);
}

registerHandler(function logWarning(message, options) {
  Logger.warn(`WARNING: ${message}`);
  if ('trace' in Logger) {
    Logger.trace();
  }
});

export let missingOptionsDeprecation = 'When calling `Ember.warn` you ' +
  'must provide an `options` hash as the third parameter.  ' +
  '`options` should include an `id` property.';
export let missingOptionsIdDeprecation = 'When calling `Ember.warn` you must provide `id` in options.';

/**
@module ember
@submodule ember-debug
*/

/**
  Display a warning with the provided message.

  * In a production build, this method is defined as an empty function (NOP).
  Uses of this method in Ember itself are stripped from the ember.prod.js build.

  @method warn
  @param {String} message A warning to display.
  @param {Boolean} test An optional boolean. If falsy, the warning
    will be displayed.
  @param {Object} options An object that can be used to pass a unique
    `id` for this warning.  The `id` can be used by Ember debugging tools
    to change the behavior (raise, log, or silence) for that specific warning.
    The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
  @for Ember
  @public
  @since 1.0.0
*/
export default function warn(message, test, options) {
  if (!options) {
    deprecate(
      missingOptionsDeprecation,
      false,
      {
        id: 'ember-debug.warn-options-missing',
        since: '2.1.0',
        until: '3.0.0',
        url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      }
    );
  }

  if (options && !options.id) {
    deprecate(
      missingOptionsIdDeprecation,
      false,
      {
        id: 'ember-debug.warn-id-missing',
        since: '2.1.0',
        until: '3.0.0',
        url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      }
    );
  }

  invoke('warn', ...arguments);
}
