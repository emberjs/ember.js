import changeEvent from './change_event';
import { addListener, removeListener } from './events';
import { unwatch, watch } from './watching';

/**
@module @ember/object
*/

/**
  @method addObserver
  @static
  @for @ember/object/observers
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @public
*/
export function addObserver(
  obj: any,
  path: string,
  target: object | Function | null,
  method: string | Function | undefined
): void {
  addListener(obj, changeEvent(path), target, method);
  watch(obj, path);
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
export function removeObserver(
  obj: any,
  path: string,
  target: object | Function | null,
  method: string | Function | undefined
): void {
  unwatch(obj, path);
  removeListener(obj, changeEvent(path), target, method);
}
