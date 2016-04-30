import Logger from 'ember-console';
import { isTesting } from './testing';

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
    Logger.error(error.stack);
  }
}
