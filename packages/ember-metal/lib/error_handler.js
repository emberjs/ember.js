import Logger from 'ember-console';
import { isTesting } from './testing';

// To maintain stacktrace consistency across browsers
let getStack = function(error) {
  var stack = error.stack;
  var message = error.message;

  if (stack && stack.indexOf(message) === -1) {
    stack = message + '\n' + stack;
  }

  return stack;
};

let onerror;
// Ember.onerror getter
export function getOnerror() {
  return onerror;
}
// Ember.onerror setter
export function setOnerror(handler) {
  onerror = handler;
}

let dispatchOverride;
// dispatch error
export function dispatchError(error) {
  if (dispatchOverride) {
    dispatchOverride(error);
  } else {
    defaultDispatch(error);
  }
}

// allows testing adapter to override dispatch
export function getDispatchOverride() {
  return dispatchOverride;
}
export function setDispatchOverride(handler) {
  dispatchOverride = handler;
}

function defaultDispatch(error) {
  if (isTesting()) {
    throw error;
  }
  if (onerror) {
    onerror(error);
  } else {
    Logger.error(getStack(error));
  }
}
