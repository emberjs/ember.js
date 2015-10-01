import isPlainFunction from 'ember-debug/is-plain-function';
import deprecate from 'ember-debug/deprecate';

export let HANDLERS = { };

export function generateTestAsFunctionDeprecation(source) {
  return `Calling \`${source}\` with a function argument is deprecated. Please ` +
    `use \`!!Constructor\` for constructors, or an \`IIFE\` to compute the test for deprecation. ` +
    `In a future version functions will be treated as truthy values instead of being executed.`;
}

function normalizeTest(test, source) {
  if (isPlainFunction(test)) {
    deprecate(
      generateTestAsFunctionDeprecation(source),
      false,
      { id: 'ember-debug.deprecate-test-as-function', until: '2.5.0' }
    );

    return test();
  }

  return test;
}

export function registerHandler(type, callback) {
  let nextHandler = HANDLERS[type] || function() { };

  HANDLERS[type] = function(message, options) {
    callback(message, options, nextHandler);
  };
}

export function invoke(type, message, test, options) {
  if (normalizeTest(test, 'Ember.' + type)) { return; }

  let handlerForType = HANDLERS[type];

  if (!handlerForType) { return; }

  if (handlerForType) {
    handlerForType(message, options);
  }
}
