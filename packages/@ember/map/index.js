import { assert } from '@ember/debug';
import { guidFor } from 'ember-utils';
import OrderedSet from './lib/ordered-set';
import { copyMap } from './lib/utils';

/**
@module @ember/map
@private
*/

/*
  JavaScript (before ES6) does not have a Map implementation. Objects,
  which are often used as dictionaries, may only have Strings as keys.

  Because Ember has a way to get a unique identifier for every object
  via `guidFor`, we can implement a performant Map with arbitrary
  keys. Because it is commonly used in low-level bookkeeping, Map is
  implemented as a pure JavaScript object for performance.

  This implementation follows the current iteration of the ES6 proposal for
  maps (http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets),
  with one exception:  as we do not have the luxury of in-VM iteration, we implement a
  forEach method for iteration.

  Map is mocked out to look like an Ember object, so you can do
  `EmberMap.create()` for symmetry with other Ember classes.
*/

/**
  A Map stores values indexed by keys. Unlike JavaScript's
  default Objects, the keys of a Map can be any JavaScript
  object.

  Internally, a Map has two data structures:

  1. `keys`: an OrderedSet of all of the existing keys
  2. `values`: a JavaScript Object indexed by the `guidFor(key)`

  When a key/value pair is added for the first time, we
  add the key to the `keys` OrderedSet, and create or
  replace an entry in `values`. When an entry is deleted,
  we delete its entry in `keys` and `values`.

  @class Map
  @private
  @constructor
*/
class Map {
  constructor() {
    this._keys = new OrderedSet();
    this._values = Object.create(null);
    this.size = 0;
  }

  /**
    @method create
    @static
    @private
  */
  static create() {
    let Constructor = this;
    return new Constructor();
  }

  /**
    Retrieve the value associated with a given key.

    @method get
    @param {*} key
    @return {*} the value associated with the key, or `undefined`
    @private
  */
  get(key) {
    if (this.size === 0) {
      return;
    }

    let values = this._values;
    let guid = guidFor(key);

    return values[guid];
  }

  /**
    Adds a value to the map. If a value for the given key has already been
    provided, the new value will replace the old value.

    @method set
    @param {*} key
    @param {*} value
    @return {Map}
    @private
  */
  set(key, value) {
    let keys = this._keys;
    let values = this._values;
    let guid = guidFor(key);

    // ensure we don't store -0
    let k = key === -0 ? 0 : key; // eslint-disable-line no-compare-neg-zero

    keys.add(k, guid);

    values[guid] = value;

    this.size = keys.size;

    return this;
  }

  /**
    Removes a value from the map for an associated key.

    @since 1.8.0
    @method delete
    @param {*} key
    @return {Boolean} true if an item was removed, false otherwise
    @private
  */
  delete(key) {
    if (this.size === 0) {
      return false;
    }
    // don't use ES6 "delete" because it will be annoying
    // to use in browsers that are not ES6 friendly;
    let keys = this._keys;
    let values = this._values;
    let guid = guidFor(key);

    if (keys.delete(key, guid)) {
      delete values[guid];
      this.size = keys.size;
      return true;
    } else {
      return false;
    }
  }

  /**
    Check whether a key is present.

    @method has
    @param {*} key
    @return {Boolean} true if the item was present, false otherwise
    @private
  */
  has(key) {
    return this._keys.has(key);
  }

  /**
    Iterate over all the keys and values. Calls the function once
    for each key, passing in value, key, and the map being iterated over,
    in that order.

    The keys are guaranteed to be iterated over in insertion order.

    @method forEach
    @param {Function} callback
    @param {*} self if passed, the `this` value inside the
      callback. By default, `this` is the map.
    @private
  */
  forEach(callback /*, ...thisArg*/) {
    assert(
      `${Object.prototype.toString.call(callback)} is not a function`,
      typeof callback === 'function'
    );

    if (this.size === 0) {
      return;
    }

    let map = this;
    let cb, thisArg;

    if (arguments.length === 2) {
      thisArg = arguments[1];
      cb = key => callback.call(thisArg, map.get(key), key, map);
    } else {
      cb = key => callback(map.get(key), key, map);
    }

    this._keys.forEach(cb);
  }

  /**
    @method clear
    @private
  */
  clear() {
    this._keys.clear();
    this._values = Object.create(null);
    this.size = 0;
  }

  /**
    @method copy
    @return {Map}
    @private
  */
  copy() {
    return copyMap(this, new Map());
  }
}

export default Map;
