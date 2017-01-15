import Logger from 'ember-console';
import { isTesting } from './testing';

// To maintain stacktrace consistency across browsers
let getStack = error => {
  let stack = error.stack;
  let message = error.message;

  if (stack && !stack.includes(message)) {
    stack = `${message}\n${stack}`;
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
