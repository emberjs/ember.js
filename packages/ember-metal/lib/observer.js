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
  addListener(obj, _path, target, method);
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
  removeListener(obj, path, target, method);
}
