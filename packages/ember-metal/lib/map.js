/**
@module ember-metal
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

import { guidFor } from "ember-metal/utils";
import { indexOf } from "ember-metal/array";
import { create } from "ember-metal/platform";
import { deprecateProperty } from "ember-metal/deprecate_property";

function missingFunction(fn) {
  throw new TypeError('' + Object.prototype.toString.call(fn) + " is not a function");
}

function missingNew(name) {
  throw new TypeError("Constructor " + name + "requires 'new'");
}

function copyNull(obj) {
  var output = create(null);

  for (var prop in obj) {
    // hasOwnPropery is not needed because obj is Object.create(null);
    output[prop] = obj[prop];
  }

  return output;
}

function copyMap(original, newObject) {
  var keys = original.keys.copy();
  var values = copyNull(original.values);

  newObject.keys = keys;
  newObject.values = values;
  newObject.size = original.size;

  return newObject;
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

  if (this instanceof OrderedSet) {
    this.clear();
    this._silenceRemoveDeprecation = false;
  } else {
    missingNew("OrderedSet");
  }
}

/**
  @method create
  @static
  @return {Ember.OrderedSet}
*/
OrderedSet.create = function() {
  var Constructor = this;

  return new Constructor();
};

OrderedSet.prototype = {
  constructor: OrderedSet,
  /**
    @method clear
  */
  clear: function() {
    this.presenceSet = create(null);
    this.list = [];
    this.size = 0;
  },

  /**
    @method add
    @param obj
    @param guid (optional, and for internal use)
    @return {Ember.OrderedSet}
  */
  add: function(obj, _guid) {
    var guid = _guid || guidFor(obj);
    var presenceSet = this.presenceSet;
    var list = this.list;

    if (presenceSet[guid] === true) {
      return;
    }

    presenceSet[guid] = true;
    this.size = list.push(obj);

    return this;
  },

  /**
    @deprecated

    @method remove
    @param obj
    @param _guid (optional and for internal use only)
    @return {Boolean}
  */
  remove: function(obj, _guid) {
    Ember.deprecate('Calling `OrderedSet.prototype.remove` has been deprecated, please use `OrderedSet.prototype.delete` instead.', this._silenceRemoveDeprecation);

    return this.delete(obj, _guid);
  },

  /**
    @method delete
    @param obj
    @param _guid (optional and for internal use only)
    @return {Boolean}
  */
  delete: function(obj, _guid) {
    var guid = _guid || guidFor(obj);
    var presenceSet = this.presenceSet;
    var list = this.list;

    if (presenceSet[guid] === true) {
      delete presenceSet[guid];
      var index = indexOf.call(list, obj);
      if (index > -1) {
        list.splice(index, 1);
      }
      this.size = list.length;
      return true;
    } else {
      return false;
    }
  },

  /**
    @method isEmpty
    @return {Boolean}
  */
  isEmpty: function() {
    return this.size === 0;
  },

  /**
    @method has
    @param obj
    @return {Boolean}
  */
  has: function(obj) {
    if (this.size === 0) { return false; }

    var guid = guidFor(obj);
    var presenceSet = this.presenceSet;

    return presenceSet[guid] === true;
  },

  /**
    @method forEach
    @param {Function} fn
    @param self
  */
  forEach: function(fn /*, thisArg*/) {
    if (typeof fn !== 'function') {
      missingFunction(fn);
    }

    if (this.size === 0) { return; }

    var list = this.list;
    var length = arguments.length;
    var i;

    if (length === 2) {
      for (i = 0; i < list.length; i++) {
        fn.call(arguments[1], list[i]);
      }
    } else {
      for (i = 0; i < list.length; i++) {
        fn(list[i]);
      }
    }
  },

  /**
    @method toArray
    @return {Array}
  */
  toArray: function() {
    return this.list.slice();
  },

  /**
    @method copy
    @return {Ember.OrderedSet}
  */
  copy: function() {
    var Constructor = this.constructor;
    var set = new Constructor();

    set._silenceRemoveDeprecation = this._silenceRemoveDeprecation;
    set.presenceSet = copyNull(this.presenceSet);
    set.list = this.toArray();
    set.size = this.size;

    return set;
  }
};

deprecateProperty(OrderedSet.prototype, 'length', 'size');

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
  if (this instanceof this.constructor) {
    this.keys = OrderedSet.create();
    this.keys._silenceRemoveDeprecation = true;
    this.values = create(null);
    this.size = 0;
  } else {
    missingNew("OrderedSet");
  }
}

Ember.Map = Map;

/**
  @method create
  @static
*/
Map.create = function() {
  var Constructor = this;
  return new Constructor();
};

Map.prototype = {
  constructor: Map,

  /**
    This property will change as the number of objects in the map changes.

    @property size
    @type number
    @default 0
  */
  size: 0,

  /**
    Retrieve the value associated with a given key.

    @method get
    @param {*} key
    @return {*} the value associated with the key, or `undefined`
  */
  get: function(key) {
    if (this.size === 0) { return; }

    var values = this.values;
    var guid = guidFor(key);

    return values[guid];
  },

  /**
    Adds a value to the map. If a value for the given key has already been
    provided, the new value will replace the old value.

    @method set
    @param {*} key
    @param {*} value
    @return {Ember.Map}
  */
  set: function(key, value) {
    var keys = this.keys;
    var values = this.values;
    var guid = guidFor(key);

    // ensure we don't store -0
    var k = key === -0 ? 0 : key;

    keys.add(k, guid);

    values[guid] = value;

    this.size = keys.size;

    return this;
  },

  /**
    @deprecated see delete
    Removes a value from the map for an associated key.

    @method remove
    @param {*} key
    @return {Boolean} true if an item was removed, false otherwise
  */
  remove: function(key) {
    Ember.deprecate('Calling `Map.prototype.remove` has been deprecated, please use `Map.prototype.delete` instead.');

    return this.delete(key);
  },

  /**
    Removes a value from the map for an associated key.

    @method delete
    @param {*} key
    @return {Boolean} true if an item was removed, false otherwise
  */
  delete: function(key) {
    if (this.size === 0) { return false; }
    // don't use ES6 "delete" because it will be annoying
    // to use in browsers that are not ES6 friendly;
    var keys = this.keys;
    var values = this.values;
    var guid = guidFor(key);

    if (keys.delete(key, guid)) {
      delete values[guid];
      this.size = keys.size;
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
  */
  has: function(key) {
    return this.keys.has(key);
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
  */
  forEach: function(callback /*, thisArg*/) {
    if (typeof callback !== 'function') {
      missingFunction(callback);
    }

    if (this.size === 0) { return; }

    var length = arguments.length;
    var map = this;
    var cb, thisArg;

    if (length === 2) {
      thisArg = arguments[1];
      cb = function(key) {
        callback.call(thisArg, map.get(key), key, map);
      };
    } else {
      cb = function(key) {
        callback(map.get(key), key, map);
      };
    }

    this.keys.forEach(cb);
  },

  /**
    @method clear
  */
  clear: function() {
    this.keys.clear();
    this.values = create(null);
    this.size = 0;
  },

  /**
    @method copy
    @return {Ember.Map}
  */
  copy: function() {
    return copyMap(this, new Map());
  }
};

deprecateProperty(Map.prototype, 'length', 'size');

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
  this.defaultValue = options.defaultValue;
}

/**
  @method create
  @static
  @param [options]
    @param {*} [options.defaultValue]
  @return {Ember.MapWithDefault|Ember.Map} If options are passed, returns
    `Ember.MapWithDefault` otherwise returns `Ember.Map`
*/
MapWithDefault.create = function(options) {
  if (options) {
    return new MapWithDefault(options);
  } else {
    return new Map();
  }
};

MapWithDefault.prototype = create(Map.prototype);
MapWithDefault.prototype.constructor = MapWithDefault;
MapWithDefault.prototype._super$constructor = Map;
MapWithDefault.prototype._super$get = Map.prototype.get;

/**
  Retrieve the value associated with a given key.

  @method get
  @param {*} key
  @return {*} the value associated with the key, or the default value
*/
MapWithDefault.prototype.get = function(key) {
  var hasValue = this.has(key);

  if (hasValue) {
    return this._super$get(key);
  } else {
    var defaultValue = this.defaultValue(key);
    this.set(key, defaultValue);
    return defaultValue;
  }
};

/**
  @method copy
  @return {Ember.MapWithDefault}
*/
MapWithDefault.prototype.copy = function() {
  var Constructor = this.constructor;
  return copyMap(this, new Constructor({
    defaultValue: this.defaultValue
  }));
};

export default Map;

export {
  OrderedSet,
  Map,
  MapWithDefault
};
