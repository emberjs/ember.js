import { GUID_KEY, HAS_NATIVE_WEAKMAP } from 'ember-utils';
import {
  peekMeta,
  meta as metaFor,
  UNDEFINED
} from './meta';

/**
 @module ember
*/
let id = 0;

// Returns whether Type(value) is Object according to the terminology in the spec
function isObject(value) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

/*
 * @class Ember.WeakMap
 * @public
 * @category ember-metal-weakmap
 *
 * A partial polyfill for [WeakMap](http://www.ecma-international.org/ecma-262/6.0/#sec-weakmap-objects).
 *
 * There is a small but important caveat. This implementation assumes that the
 * weak map will live longer (in the sense of garbage collection) than all of its
 * keys, otherwise it is possible to leak the values stored in the weak map. In
 * practice, most use cases satisfy this limitation which is why it is included
 * in ember-metal.
 */
export class WeakMapPolyfill {
  constructor(iterable) {
    this._id = GUID_KEY + (id++);

    if (iterable == null) {
      return;
    } else if (Array.isArray(iterable)) {
      for (let i = 0; i < iterable.length; i++) {
        let [key, value] = iterable[i];
        this.set(key, value);
      }
    } else {
      throw new TypeError('The weak map constructor polyfill only supports an array argument');
    }
  }

  /*
   * @method get
   * @param key {Object | Function}
   * @return {Any} stored value
   */
  get(obj) {
    if (!isObject(obj)) { return undefined; }

    let meta = peekMeta(obj);
    if (meta !== undefined) {
      let map = meta.readableWeak();
      if (map !== undefined) {
        let val = map[this._id];
        if (val === UNDEFINED) {
          return undefined;
        }
        return val;
      }
    }
  }

  /*
   * @method set
   * @param key {Object | Function}
   * @param value {Any}
   * @return {WeakMap} the weak map
   */
  set(obj, value) {
    if (!isObject(obj)) {
      throw new TypeError('Invalid value used as weak map key');
    }

    if (value === undefined) {
      value = UNDEFINED;
    }

    metaFor(obj).writableWeak()[this._id] = value;

    return this;
  }

  /*
   * @method has
   * @param key {Object | Function}
   * @return {boolean} if the key exists
   */
  has(obj) {
    if (!isObject(obj)) { return false; }

    let meta = peekMeta(obj);
    if (meta !== undefined) {
      let map = meta.readableWeak();
      if (map !== undefined) {
        return map[this._id] !== undefined;
      }
    }

    return false;
  }

  /*
   * @method delete
   * @param key {Object | Function}
   * @return {boolean} if the key was deleted
   */
  delete(obj) {
    if (this.has(obj)) {
      delete peekMeta(obj).writableWeak()[this._id];
      return true;
    } else {
      return false;
    }
  }

  /*
   * @method toString
   * @return {String}
   */
  toString() {
    return '[object WeakMap]';
  }

}

export default HAS_NATIVE_WEAKMAP ? WeakMap : WeakMapPolyfill;
