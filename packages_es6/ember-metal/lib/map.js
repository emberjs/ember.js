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
  with two exceptions. First, because we need our implementation to be pleasant
  on older browsers, we do not use the `delete` name (using `remove` instead).
  Second, as we do not have the luxury of in-VM iteration, we implement a
  forEach method for iteration.

  Map is mocked out to look like an Ember object, so you can do
  `Ember.Map.create()` for symmetry with other Ember classes.
*/

// ES6Todo: Never needed? require('ember-metal/enumerable_utils');
// require('ember-metal/utils');
// require('ember-metal/core');
// require('ember-metal/property_set');

import ArrayPolyfills from "ember-metal/array"
import {guidFor} from "ember-metal/utils";
import {set} from "ember-metal/propert_set";

var indexOf = ArrayPolyfills.indexOf;

var copy = function(obj) {
  var output = {};

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) { output[prop] = obj[prop]; }
  }

  return output;
};

var copyMap = function(original, newObject) {
  var keys = original.keys.copy(),
      values = copy(original.values);

  newObject.keys = keys;
  newObject.values = values;
  newObject.length = original.length;

  return newObject;
};

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
  this.clear();
};

/**
  @method create
  @static
  @return {Ember.OrderedSet}
*/
OrderedSet.create = function() {
  return new OrderedSet();
};


OrderedSet.prototype = {
  /**
    @method clear
  */
  clear: function() {
    this.presenceSet = {};
    this.list = [];
  },

  /**
    @method add
    @param obj
  */
  add: function(obj) {
    var guid = guidFor(obj),
        presenceSet = this.presenceSet,
        list = this.list;

    if (guid in presenceSet) { return; }

    presenceSet[guid] = true;
    list.push(obj);
  },

  /**
    @method remove
    @param obj
  */
  remove: function(obj) {
    var guid = guidFor(obj),
        presenceSet = this.presenceSet,
        list = this.list;

    delete presenceSet[guid];

    var index = indexOf.call(list, obj);
    if (index > -1) {
      list.splice(index, 1);
    }
  },

  /**
    @method isEmpty
    @return {Boolean}
  */
  isEmpty: function() {
    return this.list.length === 0;
  },

  /**
    @method has
    @param obj
    @return {Boolean}
  */
  has: function(obj) {
    var guid = guidFor(obj),
        presenceSet = this.presenceSet;

    return guid in presenceSet;
  },

  /**
    @method forEach
    @param {Function} fn
    @param self
  */
  forEach: function(fn, self) {
    // allow mutation during iteration
    var list = this.toArray();

    for (var i = 0, j = list.length; i < j; i++) {
      fn.call(self, list[i]);
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
    var set = new OrderedSet();

    set.presenceSet = copy(this.presenceSet);
    set.list = this.toArray();

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
var Map = Ember.Map = function() {
  this.keys = OrderedSet.create();
  this.values = {};
};

/**
  @method create
  @static
*/
Map.create = function() {
  return new Map();
};

Map.prototype = {
  /**
    This property will change as the number of objects in the map changes.
   
    @property length
    @type number
    @default 0
  */
  length: 0,
    
    
  /**
    Retrieve the value associated with a given key.

    @method get
    @param {*} key
    @return {*} the value associated with the key, or `undefined`
  */
  get: function(key) {
    var values = this.values,
        guid = guidFor(key);

    return values[guid];
  },

  /**
    Adds a value to the map. If a value for the given key has already been
    provided, the new value will replace the old value.

    @method set
    @param {*} key
    @param {*} value
  */
  set: function(key, value) {
    var keys = this.keys,
        values = this.values,
        guid = guidFor(key);

    keys.add(key);
    values[guid] = value;
    set(this, 'length', keys.list.length);
  },

  /**
    Removes a value from the map for an associated key.

    @method remove
    @param {*} key
    @return {Boolean} true if an item was removed, false otherwise
  */
  remove: function(key) {
    // don't use ES6 "delete" because it will be annoying
    // to use in browsers that are not ES6 friendly;
    var keys = this.keys,
        values = this.values,
        guid = guidFor(key);

    if (values.hasOwnProperty(guid)) {
      keys.remove(key);
      delete values[guid];
      set(this, 'length', keys.list.length);
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
    var values = this.values,
        guid = guidFor(key);

    return values.hasOwnProperty(guid);
  },

  /**
    Iterate over all the keys and values. Calls the function once
    for each key, passing in the key and value, in that order.

    The keys are guaranteed to be iterated over in insertion order.

    @method forEach
    @param {Function} callback
    @param {*} self if passed, the `this` value inside the
      callback. By default, `this` is the map.
  */
  forEach: function(callback, self) {
    var keys = this.keys,
        values = this.values;

    keys.forEach(function(key) {
      var guid = guidFor(key);
      callback.call(self, key, values[guid]);
    });
  },

  /**
    @method copy
    @return {Ember.Map}
  */
  copy: function() {
    return copyMap(this, new Map());
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
  Map.call(this);
  this.defaultValue = options.defaultValue;
};

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

MapWithDefault.prototype = Ember.create(Map.prototype);

/**
  Retrieve the value associated with a given key.

  @method get
  @param {*} key
  @return {*} the value associated with the key, or the default value
*/
MapWithDefault.prototype.get = function(key) {
  var hasValue = this.has(key);

  if (hasValue) {
    return Map.prototype.get.call(this, key);
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
  return copyMap(this, new MapWithDefault({
    defaultValue: this.defaultValue
  }));
};

export {OrderedSet, Map, MapWithDefault};
