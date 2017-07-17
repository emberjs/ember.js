/**
@module ember
@submodule ember-metal
*/

/*
  JavaScript (before ES6) does not have a Map implementation. Objects,
  which are often used as dictionaries, may only have Strings as keys.

  Because Ember has a way to get a unique identifier for every object
  via `Ember.guidFor`, we can implement a performant Map with arbitrary
  keys. Because it is commonly used in low-level bookkeeping, Map is
  implemented as a pure JavaScript object for performance.

  This implementation follows the current iteration of the ES6 proposal for
  maps (http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets),
  with one exception:  as we do not have the luxury of in-VM iteration, we implement a
  forEach method for iteration.

  Map is mocked out to look like an Ember object, so you can do
  `Ember.Map.create()` for symmetry with other Ember classes.
*/
import { guidFor } from 'ember-utils';
import { runInDebug } from 'ember-debug';
const THRESHOLD = 50;

function missingFunction(fn) {
  throw new TypeError(`${Object.prototype.toString.call(fn)} is not a function`);
}

function missingNew(name) {
  throw new TypeError(`Constructor ${name} requires 'new'`);
}

function copyNull(obj) {
  let output = Object.create(null);

  for (let prop in obj) {
    // hasOwnPropery is not needed because obj is Object.create(null);
    output[prop] = obj[prop];
  }

  return output;
}

/**
  This class is used internally by Ember and Ember Data.
  Please do not use it at this time. We plan to clean it up
  and add many tests soon.

  @class OrderedSet
  @namespace Ember
  @constructor
  @private
*/
function OrderedSet() {
  runInDebug(() => {
    if (!(this instanceof OrderedSet)) {
      missingNew('OrderedSet');
    }
  })
  this.clear();
}

/**
  @method create
  @static
  @return {Ember.OrderedSet}
  @private
*/
OrderedSet.create = function() {
  return new this();
};

OrderedSet.prototype = {
  constructor: OrderedSet,
  /**
    @method clear
    @private
  */
  clear() {
    this._presenceSet = undefined;
    this._list = undefined;
    this._value = undefined;
    this.size = 0;
  },

  get presenceSet() {
    return this._presenceSet || (this._presenceSet = Object.create(null))
  },

  get list() {
    if (this._list !== undefined) { return this._list; }
    let size = this.size;
    if (size === 0) { return this._list = []; }
    if (size === 1) { return this._list = [this._value]; }
  },
  /**
    @method add
    @param obj
    @param guid (optional, and for internal use)
    @return {Ember.OrderedSet}
    @private
  */
  add(obj) {
    let size = this.size;

    if (size === 1 && this._value === obj) {
      return this;
    }

    if (size === 0) {
      this._value = obj;
      this.size = 1;
      return this;
    }

     if (size < THRESHOLD) {
      let list = this.list;
      for (let i = 0; i < list.length; i++) {
        let entry = list[i];
        if (list[i] === obj ||
          /* for NaN */
          obj !== obj && entry !== entry) {
          return this;
        }
      }
      list.push(obj);
      this.size++;
      return this;
    }

    return this._slowAdd(obj, size)
  },

  _slowAdd(obj, size) {
    let guid = guidFor(obj);

    let presenceSet = this.presenceSet;
    if (size === THRESHOLD) {
      // upgrade to index set
      let list = this.list;
      for (let i = 0; i < list.length; i++) {
        let item = list[i];
        presenceSet[guidFor(item)] = true;
      }
    }

    if (presenceSet[guid] !== true) {
      presenceSet[guid] = true;
      this.list.push(obj);
      this.size++;
    }
    return this;
  },
  /**
    @since 1.8.0
    @method delete
    @param obj
    @param _guid (optional and for internal use only)
    @return {Boolean}
    @private
  */
  delete(obj) {
    let size = this.size;

    if (size === 0) { return false;}
    if (size === 1) {
      if (this._value === obj ||
        /* for NaN */
          obj !== obj && this._value !== this._value) {
        this._value = undefined;
        this.size--;
        return true;
      }
      return false;
    }

    if (size >= THRESHOLD) {
      let presenceSet = this.presenceSet;
      let guid = guidFor(obj);
      if (presenceSet[guid] === true) {
        delete presenceSet[guid];
      } else {
        return false;
      }
    }

    let list = this.list;
    for (let i = 0; i < list.length; i++) {
      let entry = list[i];
      if (entry === obj ||
        /* for NaN */
        obj !== obj && entry !== entry) {
        list.splice(i, 1);
        this.size--;
        if (this.size === 1) {
          this._value = this._list[0];
          this._list = undefined;
        }
        return true;
      }
    }
    return false;
  },

  /**
    @method isEmpty
    @return {Boolean}
    @private
  */
  isEmpty() {
    return this.size === 0;
  },

  /**
    @method has
    @param obj
    @return {Boolean}
    @private
  */
  has(obj) {
    let size = this.size;
    if (size === 0) { return false; }
    if (size === 1) {
      let entry = this._value;
      return entry === obj ||
        /* for NaN */
          obj !== obj && entry !== entry;
    }
    if (size < THRESHOLD) {
      let list = this.list;
      for (let i = 0; i < list.length; i++) {
        let entry = list[i];
        if (entry === obj ||
          /* for NaN */
          obj !== obj && entry !== entry) {
          return true;
        }
      }

      return false;
    } else {
      return this.presenceSet[guidFor(obj)] === true;
    }
  },

  /**
    @method forEach
    @param {Function} fn
    @param self
    @private
  */
  forEach(fn /*, ...thisArg*/) {
    if (typeof fn !== 'function') {
      missingFunction(fn);
    }

    if (this.size === 0) { return; }

    let list = this.list;

    if (arguments.length === 2) {
      for (let i = 0; i < list.length; i++) {
        fn.call(arguments[1], list[i]);
      }
    } else {
      for (let i = 0; i < list.length; i++) {
        fn(list[i]);
      }
    }
  },

  /**
    @method toArray
    @return {Array}
    @private
  */
  toArray() {
    return this.list.slice();
  },

  /**
    @method copy
    @return {Ember.OrderedSet}
    @private
  */
  copy() {
    let set = new this.constructor();

    if (this._presenceSet) { set._presenceSet = copyNull(this._presenceSet); }
    if (this._list)        { set._list = this._list.slice(); }

    set.size = this.size;

    return set;
  }
};

/**
  A Map stores values indexed by keys. Unlike JavaScript's
  default Objects, the keys of a Map can be any JavaScript
  object.

  Internally, a Map has two data structures:

  1. `keys`: an OrderedSet of all of the existing keys
  2. `values`: a JavaScript Object indexed by the `Ember.guidFor(key)`

  When a key/value pair is added for the first time, we
  add the key to the `keys` OrderedSet, and create or
  replace an entry in `values`. When an entry is deleted,
  we delete its entry in `keys` and `values`.

  @class Map
  @namespace Ember
  @private
  @constructor
*/
function Map() {
  runInDebug(() => {
    if (!(this instanceof Map)) {
      missingNew('Map');
    }
  });
  this.clear();
}

/**
  @method create
  @static
  @private
*/
Map.create = function() {
  return new this();
};

Map.prototype = {
  constructor: Map,

  /**
    This property will change as the number of objects in the map changes.

    @since 1.8.0
    @property size
    @type number
    @default 0
    @private
  */
  size: 0,

  /**
    Retrieve the value associated with a given key.

    @method get
    @param {*} key
    @return {*} the value associated with the key, or `undefined`
    @private
  */
  get(key) {
    if (this.size === 0) { return; }

    let values = this._values;
    let guid = guidFor(key);

    return values[guid];
  },

  /**
    Adds a value to the map. If a value for the given key has already been
    provided, the new value will replace the old value.

    @method set
    @param {*} key
    @param {*} value
    @return {Ember.Map}
    @private
  */
  set(key, value) {
    let keys = this._keys;
    let values = this._values;
    let guid = guidFor(key);

    // ensure we don't store -0
    let k = key === -0 ? 0 : key;

    keys.add(k, guid);
    values[guid] = value;

    this.size = keys.size;

    return this;
  },

  /**
    Removes a value from the map for an associated key.

    @since 1.8.0
    @method delete
    @param {*} key
    @return {Boolean} true if an item was removed, false otherwise
    @private
  */
  delete(key) {
    if (this.size === 0) { return false; }
    // don't use ES6 "delete" because it will be annoying
    // to use in browsers that are not ES6 friendly;
    let keys = this._keys;
    let values = this._values;
    let guid = guidFor(key);

    if (keys.delete(key, guid)) {
      delete values[guid];
      this.size--;
      return true;
    } else {
      return false;
    }
  },

  /**
    Check whether a key is present.

    @method has
    @param {*} key
    @return {Boolean} true if the item was present, false otherwise
    @private
  */
  has(key) {
    if (this.size === 0) { return false; }
    return this._keys.has(key);
  },

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
  forEach(callback/*, ...thisArg*/) {
    if (typeof callback !== 'function') {
      missingFunction(callback);
    }

    if (this.size === 0) { return; }

    let map = this;
    let cb, thisArg;

    if (arguments.length === 2) {
      thisArg = arguments[1];
      cb = key => callback.call(thisArg, map.get(key), key, map);
    } else {
      cb = key => callback(map.get(key), key, map);
    }

    this._keys.forEach(cb);
  },

  /**
    @method clear
    @private
  */
  clear() {
    this.__keys = undefined;
    this.__values = undefined;
    this.size = 0;
  },

  get _keys() {
    return this.__keys || (this.__keys = new OrderedSet());
  },

  get _values() {
    return this.__values || (this.__values = Object.create(null));
  },
  /**
    @method copy
    @return {Ember.Map}
    @private
  */
  copy() {
    let copied = new this.constructor();

    if (this.size > 0) {
      copied.__keys = this.__keys.copy();
      copied.__values = copyNull(this.__values);
      copied.size = this.size;
    }

    return copied;
  }
};

/**
  @class MapWithDefault
  @namespace Ember
  @extends Ember.Map
  @private
  @constructor
  @param [options]
    @param {*} [options.defaultValue]
*/
function MapWithDefault(options) {
  this._super$constructor();
  if (typeof options ==='object' && options !== null) {
    this.defaultValue = options.defaultValue;
  }
}

/**
  @method create
  @static
  @param [options]
    @param {*} [options.defaultValue]
  @return {Ember.MapWithDefault|Ember.Map} If options are passed, returns
    `Ember.MapWithDefault` otherwise returns `Ember.Map`
  @private
*/
MapWithDefault.create = function(options) {
  if (options) {
    return new MapWithDefault(options);
  } else {
    return new Map();
  }
};

MapWithDefault.prototype = Object.create(Map.prototype);
MapWithDefault.prototype.constructor = MapWithDefault;
MapWithDefault.prototype._super$constructor = Map;
MapWithDefault.prototype._super$get = Map.prototype.get;
MapWithDefault.prototype._super$copy = Map.prototype.copy;

/**
  Retrieve the value associated with a given key.

  @method get
  @param {*} key
  @return {*} the value associated with the key, or the default value
  @private
*/
MapWithDefault.prototype.get = function(key) {
  let hasValue = this.has(key);

  if (hasValue) {
    return this._super$get(key);
  } else {
    let defaultValue = this.defaultValue(key);
    this.set(key, defaultValue);
    return defaultValue;
  }
};

/**
  @method copy
  @return {Ember.MapWithDefault}
  @private
*/
MapWithDefault.prototype.copy = function() {
  let map = this._super$copy();
  map.defaultValue = this.defaultValue;
  return map;
};

export default Map;

export {
  OrderedSet,
  Map,
  MapWithDefault
};
