/**
  JavaScript (before ES6) does not have a Map implementation. Objects,
  which are often used as dictionaries, may only have Strings as keys.

  Because Ember has a way to get a unique identifier for every object
  via `Ember.guidFor`, we can implement a performant Map with arbitrary
  keys. Because it is commonly used in low-level bookkeeping, Map is
  implemented as a pure JavaScript object for performance.

  This implementation follows the current iteration of the ES6 proposal
  for maps (http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets),
  with two exceptions. First, because we need our implementation to be
  pleasant on older browsers, we do not use the `delete` name (using
  `remove` instead). Second, as we do not have the luxury of in-VM
  iteration, we implement a forEach method for iteration.

  Map is mocked out to look like an Ember object, so you can do
  `Ember.Map.create()` for symmetry with other Ember classes.
*/

/** @private */
var guidFor = Ember.guidFor;
var indexOf = Ember.ArrayUtils.indexOf;

// This class is used internally by Ember.js and Ember Data.
// Please do not use it at this time. We plan to clean it up
// and add many tests soon.
var OrderedSet = Ember.OrderedSet = function() {
  this.clear();
};

OrderedSet.create = function() {
  return new OrderedSet();
};

OrderedSet.prototype = {
  clear: function() {
    this.presenceSet = {};
    this.list = [];
  },

  add: function(obj) {
    var guid = guidFor(obj),
        presenceSet = this.presenceSet,
        list = this.list;

    if (guid in presenceSet) { return; }

    presenceSet[guid] = true;
    list.push(obj);
  },

  remove: function(obj) {
    var guid = guidFor(obj),
        presenceSet = this.presenceSet,
        list = this.list;

    delete presenceSet[guid];

    var index = indexOf(list, obj);
    if (index > -1) {
      list.splice(index, 1);
    }
  },

  isEmpty: function() {
    return this.list.length === 0;
  },

  forEach: function(fn, self) {
    // allow mutation during iteration
    var list = this.list.slice();

    for (var i = 0, j = list.length; i < j; i++) {
      fn.call(self, list[i]);
    }
  },

  toArray: function() {
    return this.list.slice();
  }
};

/**
  A Map stores values indexed by keys. Unlike JavaScript's
  default Objects, the keys of a Map can be any JavaScript
  object.

  Internally, a Map has two data structures:

    `keys`: an OrderedSet of all of the existing keys
    `values`: a JavaScript Object indexed by the
      Ember.guidFor(key)

  When a key/value pair is added for the first time, we
  add the key to the `keys` OrderedSet, and create or
  replace an entry in `values`. When an entry is deleted,
  we delete its entry in `keys` and `values`.
*/

/** @private */
var Map = Ember.Map = function() {
  this.keys = Ember.OrderedSet.create();
  this.values = {};
};

Map.create = function() {
  return new Map();
};

Map.prototype = {
  /**
    Retrieve the value associated with a given key.

    @param {anything} key
    @return {anything} the value associated with the key, or undefined
  */
  get: function(key) {
    var values = this.values,
        guid = guidFor(key);

    return values[guid];
  },

  /**
    Adds a value to the map. If a value for the given key has already been
    provided, the new value will replace the old value.

    @param {anything} key
    @param {anything} value
  */
  set: function(key, value) {
    var keys = this.keys,
        values = this.values,
        guid = guidFor(key);

    keys.add(key);
    values[guid] = value;
  },

  /**
    Removes a value from the map for an associated key.

    @param {anything} key
    @returns {Boolean} true if an item was removed, false otherwise
  */
  remove: function(key) {
    // don't use ES6 "delete" because it will be annoying
    // to use in browsers that are not ES6 friendly;
    var keys = this.keys,
        values = this.values,
        guid = guidFor(key),
        value;

    if (values.hasOwnProperty(guid)) {
      keys.remove(key);
      value = values[guid];
      delete values[guid];
      return true;
    } else {
      return false;
    }
  },

  /**
    Check whether a key is present.

    @param {anything} key
    @returns {Boolean} true if the item was present, false otherwise
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

    @param {Function} callback
    @param {anything} self if passed, the `this` value inside the
      callback. By default, `this` is the map.
  */
  forEach: function(callback, self) {
    var keys = this.keys,
        values = this.values;

    keys.forEach(function(key) {
      var guid = guidFor(key);
      callback.call(self, key, values[guid]);
    });
  }
};
