import Logger from 'ember-metal/logger';
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

/**
  Display a warning with the provided message. Ember build tools will
  remove any calls to `Ember.warn()` when doing a production build.

  @method warn
  @param {String} message A warning to display.
  @param {Boolean} test An optional boolean. If falsy, the warning
    will be displayed.
  @public
*/
export default function warn() {
  invoke('warn', ...arguments);
}
