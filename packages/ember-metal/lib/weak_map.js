import { GUID_KEY } from 'ember-metal/utils';
import { meta } from 'ember-metal/meta';

var id = 0;

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
  meta(obj).writableWeak()[this._id] = value;
  return this;
};
