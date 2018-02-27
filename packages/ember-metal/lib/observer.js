import {
  watch,
  unwatch
} from './watching';
import {
  addListener,
  removeListener
} from './events';
/**
@module @ember/object
*/

const AFTER_OBSERVERS = ':change';

export function changeEvent(keyName) {
  return keyName + AFTER_OBSERVERS;
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
}
