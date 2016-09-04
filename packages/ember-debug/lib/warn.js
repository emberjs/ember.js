import Logger from 'ember-console';
import { deprecate } from 'ember-metal';
import { registerHandler as genericRegisterHandler, invoke } from './handlers';

export function registerHandler(handler) {
  genericRegisterHandler('warn', handler);
}

registerHandler(function logWarning(message, options) {
  Logger.warn('WARNING: ' + message);
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
*/
export default function warn(message, test, options) {
  if (!options) {
    deprecate(
      missingOptionsDeprecation,
      false,
      {
        id: 'ember-debug.warn-options-missing',
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
        until: '3.0.0',
        url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      }
    );
  }

  invoke('warn', ...arguments);
}
