/*global __fail__*/

import Ember from 'ember-metal/core';
import EmberError from 'ember-metal/error';
import Logger from 'ember-metal/logger';

import { registerHandler as genericRegisterHandler, invoke } from 'ember-debug/handlers';

export function registerHandler(handler) {
  genericRegisterHandler('deprecate', handler);
}

function formatMessage(_message, options) {
  let message = _message;

  if (options && options.id) {
    message = message + ` [deprecation id: ${options.id}]`;
  }

  if (options && options.url) {
    message += ' See ' + options.url + ' for more details.';
  }

  return message;
}

registerHandler(function logDeprecationToConsole(message, options) {
  let updatedMessage = formatMessage(message, options);

  Logger.warn('DEPRECATION: ' + updatedMessage);
});

registerHandler(function logDeprecationStackTrace(message, options, next) {
  if (Ember.LOG_STACKTRACE_ON_DEPRECATION) {
    let stackStr = '';
    let error, stack;

    // When using new Error, we can't do the arguments check for Chrome. Alternatives are welcome
    try { __fail__.fail(); } catch (e) { error = e; }

    if (error.stack) {
      if (error['arguments']) {
        // Chrome
        stack = error.stack.replace(/^\s+at\s+/gm, '').
          replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').
          replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
        stack.shift();
      } else {
        // Firefox
        stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').
          replace(/^\(/gm, '{anonymous}(').split('\n');
      }

      stackStr = '\n    ' + stack.slice(2).join('\n    ');
    }

    let updatedMessage = formatMessage(message, options);

    Logger.warn('DEPRECATION: ' + updatedMessage + stackStr);
  } else {
    next(...arguments);
  }
});

registerHandler(function raiseOnDeprecation(message, options, next) {
  if (Ember.ENV.RAISE_ON_DEPRECATION) {
    let updatedMessage = formatMessage(message);

    throw new EmberError(updatedMessage);
  } else {
    next(...arguments);
  }
});

export let missingOptionsDeprecation = 'When calling `Ember.deprecate` you ' +
  'must provide an `options` hash as the third parameter.  ' +
  '`options` should include `id` and `until` properties.';
export let missingOptionsIdDeprecation = 'When calling `Ember.deprecate` you must provide `id` in options.';
export let missingOptionsUntilDeprecation = 'When calling `Ember.deprecate` you must provide `until` in options.';

/**
  Display a deprecation warning with the provided message and a stack trace
  (Chrome and Firefox only). Ember build tools will remove any calls to
  `Ember.deprecate()` when doing a production build.

  @method deprecate
  @param {String} message A description of the deprecation.
  @param {Boolean|Function} test A boolean. If falsy, the deprecation
    will be displayed. If this is a function, it will be executed and its return
    value will be used as condition.
  @param {Object} options An object that can be used to pass
    in a `url` to the transition guide on the emberjs.com website, and a unique
    `id` for this deprecation. The `id` can be used by Ember debugging tools
    to change the behavior (raise, log or silence) for that specific deprecation.
    The `id` should be namespaced by dots, e.g. "view.helper.select".
  @public
*/
export default function deprecate(message, test, options) {
  if (!options || (!options.id && !options.until)) {
    deprecate(
      missingOptionsDeprecation,
      false,
      { id: 'ember-debug.deprecate-options-missing', until: '3.0.0' }
    );
  }

  if (options && !options.id) {
    deprecate(
      missingOptionsIdDeprecation,
      false,
      { id: 'ember-debug.deprecate-id-missing', until: '3.0.0' }
    );
  }

  if (options && !options.until) {
    deprecate(
      missingOptionsUntilDeprecation,
      options && options.until,
      { id: 'ember-debug.deprecate-until-missing', until: '3.0.0' }
    );
  }

  invoke('deprecate', ...arguments);
}
