import { typeOf } from 'ember-runtime/utils';
import { assert } from 'ember-metal/debug';
import { GUID_KEY } from 'ember-metal/utils';
import { meta } from 'ember-metal/meta';

var id = 0;
const UNDEFINED = function() {};

/*
 * @private
 * @class Ember.WeakMap
 *
 * Weak relationship from Map -> Key, but not Key to Map.
 *
 * Key must be a non null object
 */
export default function WeakMap() {
  this._id = GUID_KEY + (id++);
}

/*
 * @method get
 * @param key {Object}
 * @return {*} stored value
 */
WeakMap.prototype.get = function(obj) {
  var map = meta(obj).readableWeak();
  if (map) {
    if (map[this._id] === UNDEFINED) {
      return undefined;
    }

    return map[this._id];
  }
};

/*
 * @method set
 * @param key {Object}
 * @param value {Any}
 * @return {Any} stored value
 */
WeakMap.prototype.set = function(obj, value) {
  assert('Uncaught TypeError: Invalid value used as weak map key', typeOf(obj) === 'object');

  if (value === undefined) {
    value = UNDEFINED;
  }

  meta(obj).writableWeak()[this._id] = value;
  return this;
};

/*
 * @method has
 * @param key {Object}
 * @return {Boolean} if the key exists
 */
WeakMap.prototype.has = function(obj) {
  var map = meta(obj).readableWeak();

  if (map && map[this._id] !== undefined) {
    return true;
  }

  return false;
};

/*
 * @method delete
 * @param key {Object}
 */
WeakMap.prototype.delete = function(obj) {
  if (this.has(obj)) {
    delete meta(obj).writableWeak()[this._id];
  }

  return this;
};
