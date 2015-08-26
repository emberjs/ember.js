import Logger from 'ember-metal/logger';
import { deprecate } from 'ember-metal/debug';
import { registerHandler as genericRegisterHandler, invoke } from 'ember-debug/handlers';

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
  Display a warning with the provided message. Ember build tools will
  remove any calls to `Ember.warn()` when doing a production build.

  @method warn
  @param {String} message A warning to display.
  @param {Boolean} test An optional boolean. If falsy, the warning
    will be displayed.
  @public
*/
export default function warn(message, test, options) {
  if (!options) {
    deprecate(
      missingOptionsDeprecation,
      false,
      { id: 'ember-debug.warn-options-missing', until: '3.0.0' }
    );
  }

  if (options && !options.id) {
    deprecate(
      missingOptionsIdDeprecation,
      false,
      { id: 'ember-debug.warn-id-missing', until: '3.0.0' }
    );
  }

  invoke('warn', ...arguments);
}
