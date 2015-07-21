import isPlainFunction from 'ember-debug/is-plain-function';

export let HANDLERS = { };

function normalizeTest(test) {
  return isPlainFunction(test) ? test() : test;
}

export function registerHandler(type, callback) {
  let nextHandler = HANDLERS[type] || function() { };

  HANDLERS[type] = function(message, options) {
    callback(message, options, nextHandler);
  };
}

export function invoke(type, message, test, options) {
  if (normalizeTest(test)) { return; }

  let handlerForType = HANDLERS[type];

  if (!handlerForType) { return; }

  if (handlerForType) {
    handlerForType(message, options);
  }
}
