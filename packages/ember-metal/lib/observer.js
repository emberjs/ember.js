import {
  watch,
  unwatch
} from "ember-metal/watching";
import { map } from "ember-metal/array";
import {
  listenersFor,
  addListener,
  removeListener,
  suspendListeners,
  suspendListener
} from "ember-metal/events";
/**
@module ember-metal
*/

var AFTER_OBSERVERS = ':change';

function changeEvent(keyName) {
  return keyName + AFTER_OBSERVERS;
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

// Suspend observer during callback.
//
// This should only be used by the target of the observer
// while it is setting the observed path.
export function _suspendObserver(obj, path, target, method, callback) {
  return suspendListener(obj, changeEvent(path), target, method, callback);
}

export function _suspendObservers(obj, paths, target, method, callback) {
  var events = map.call(paths, changeEvent);
  return suspendListeners(obj, events, target, method, callback);
}
