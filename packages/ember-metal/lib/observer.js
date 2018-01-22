import {
  watch,
  unwatch
} from './watching';
import {
  listenersFor,
  addListener,
  removeListener
} from './events';
/**
@module @ember/object
*/

const AFTER_OBSERVERS = ':change';
const BEFORE_OBSERVERS = ':before';

export function changeEvent(keyName) {
  return keyName + AFTER_OBSERVERS;
}

export function beforeEvent(keyName) {
  return keyName + BEFORE_OBSERVERS;
}

/**
  @method addObserver
  @static
  @for @ember/object/observers
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
  @static
  @for @ember/object/observers
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
  @static
  @for @ember/object/observers
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

/**
  @method removeBeforeObserver
  @static
  @for @ember/object/observers
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
