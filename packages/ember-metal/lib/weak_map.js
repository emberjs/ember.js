import { assert } from 'ember-metal/debug';
import { GUID_KEY } from 'ember-metal/utils';
import { meta } from 'ember-metal/meta';

var id = 0;
function UNDEFINED() {}

function isPrimitiveType(thing) {
  switch(typeof thing) {
    case 'string':
    case 'boolean':
    case 'number':
    case 'undefined':
    case 'null':
    case 'symbol':
      return true;
    default:
      return false;
  }
}

/*
 * @public
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
  assert('Uncaught TypeError: Invalid value used as weak map key', !isPrimitiveType(obj));

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

  return (map && map[this._id] !== undefined);
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
