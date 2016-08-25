import {
  watch,
  unwatch
} from './watching';
import {
  listenersFor,
  addListener,
  removeListener,
  suspendListeners,
  suspendListener
} from './events';
/**
@module ember-metal
*/

const AFTER_OBSERVERS = ':change';
const BEFORE_OBSERVERS = ':before';

function changeEvent(keyName) {
  return keyName + AFTER_OBSERVERS;
}

function beforeEvent(keyName) {
  return keyName + BEFORE_OBSERVERS;
}

/**
  @method addObserver
  @for Ember
  @param obj
  @param {String} _path
  @param {Object|Function} target
  @param {Function|String} [method]
  @public
*/
export function addObserver(obj, _path, target, method) {
  addListener(obj, changeEvent(_path), target, method);
  watch(obj, _path);

  return this;
}

export function observersFor(obj, path) {
  return listenersFor(obj, changeEvent(path));
}

/**
  @method removeObserver
  @for Ember
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @public
*/
export function removeObserver(obj, path, target, method) {
  unwatch(obj, path);
  removeListener(obj, changeEvent(path), target, method);

  return this;
}

/**
  @method _addBeforeObserver
  @for Ember
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @deprecated
  @private
*/
export function _addBeforeObserver(obj, path, target, method) {
  addListener(obj, beforeEvent(path), target, method);
  watch(obj, path);

  return this;
}

// Suspend observer during callback.
//
// This should only be used by the target of the observer
// while it is setting the observed path.
export function _suspendObserver(obj, path, target, method, callback) {
  return suspendListener(obj, changeEvent(path), target, method, callback);
}

export function _suspendObservers(obj, paths, target, method, callback) {
  let events = paths.map(changeEvent);
  return suspendListeners(obj, events, target, method, callback);
}

/**
  @method removeBeforeObserver
  @for Ember
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @deprecated
  @private
*/
export function _removeBeforeObserver(obj, path, target, method) {
  unwatch(obj, path);
  removeListener(obj, beforeEvent(path), target, method);

  return this;
}
