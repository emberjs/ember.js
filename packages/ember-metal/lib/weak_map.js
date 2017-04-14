import { isObject } from 'ember-utils';
import {
  peekMeta,
  meta as metaFor,
  UNDEFINED
} from './meta';

let id = 0;

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
export default function WeakMap(iterable) {
  if (!(this instanceof WeakMap)) {
    throw new TypeError(`Constructor WeakMap requires 'new'`);
  }

  this._id = id++;

  if (iterable === null || iterable === undefined) {
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
WeakMap.prototype.get = function(obj) {
  if (!isObject(obj)) {
    return undefined;
  }

  let meta = peekMeta(obj);
  if (meta) {
    let map = meta.readableWeak();
    if (map) {
      if (map[this._id] === UNDEFINED) {
        return undefined;
      }

      return map[this._id];
    }
  }
};

/*
 * @method set
 * @param key {Object | Function}
 * @param value {Any}
 * @return {WeakMap} the weak map
 */
WeakMap.prototype.set = function(obj, value) {
  if (!isObject(obj)) {
    throw new TypeError('Invalid value used as weak map key');
  }

  if (value === undefined) {
    value = UNDEFINED;
  }

  metaFor(obj).writableWeak()[this._id] = value;

  return this;
};

/*
 * @method has
 * @param key {Object | Function}
 * @return {boolean} if the key exists
 */
WeakMap.prototype.has = function(obj) {
  if (!isObject(obj)) {
    return false;
  }

  let meta = peekMeta(obj);
  if (meta) {
    let map = meta.readableWeak();
    if (map) {
      return map[this._id] !== undefined;
    }
  }

  return false;
};

/*
 * @method delete
 * @param key {Object | Function}
 * @return {boolean} if the key was deleted
 */
WeakMap.prototype.delete = function(obj) {
  if (this.has(obj)) {
    delete metaFor(obj).writableWeak()[this._id];
    return true;
  } else {
    return false;
  }
};

/*
 * @method toString
 * @return {String}
 */
WeakMap.prototype.toString = function() {
  return '[object WeakMap]';
};
