// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


require('ember-runtime/mixins/array');
require('ember-runtime/mixins/mutable_enumerable');

// ..........................................................
// CONSTANTS
//

var OUT_OF_RANGE_EXCEPTION = "Index out of range" ;
var EMPTY = [];

// ..........................................................
// HELPERS
//

var get = Ember.get, set = Ember.set, forEach = Ember.ArrayUtils.forEach;

/**
  @class

  This mixin defines the API for modifying array-like objects.  These methods
  can be applied only to a collection that keeps its items in an ordered set.

  Note that an Array can change even if it does not implement this mixin.
  For example, one might implement a SparseArray that cannot be directly
  modified, but if its underlying enumerable changes, it will change also.

  @extends Ember.Mixin
  @extends Ember.Array
  @extends Ember.MutableEnumerable
*/
Ember.MutableArray = Ember.Mixin.create(Ember.Array, Ember.MutableEnumerable,
  /** @scope Ember.MutableArray.prototype */ {

  /**
    __Required.__ You must implement this method to apply this mixin.

    This is one of the primitives you must implement to support Ember.Array.  You
    should replace amt objects started at idx with the objects in the passed
    array.  You should also call this.enumerableContentDidChange() ;

    @param {Number} idx
      Starting index in the array to replace.  If idx >= length, then append
      to the end of the array.

    @param {Number} amt
      Number of elements that should be removed from the array, starting at
      *idx*.

    @param {Array} objects
      An array of zero or more objects that should be inserted into the array
      at *idx*
  */
  replace: Ember.required(),

  /**
    Remove all elements from self. This is useful if you
    want to reuse an existing array without having to recreate it.

        var colors = ["red", "green", "blue"];
        color.length();  => 3
        colors.clear();  => []
        colors.length(); => 0

    @returns {Ember.Array} An empty Array. 
  */
  clear: function () {
    var len = get(this, 'length');
    if (len === 0) return this;
    this.replace(0, len, EMPTY);
    return this;
  },

  /**
    This will use the primitive replace() method to insert an object at the
    specified index.

        var colors = ["red", "green", "blue"];
        colors.insertAt(2, "yellow"); => ["red", "green", "yellow", "blue"]
        colors.insertAt(5, "orange"); => Error: Index out of range

    @param {Number} idx index of insert the object at.
    @param {Object} object object to insert
  */
  insertAt: function(idx, object) {
    if (idx > get(this, 'length')) throw new Error(OUT_OF_RANGE_EXCEPTION) ;
    this.replace(idx, 0, [object]) ;
    return this ;
  },

  /**
    Remove an object at the specified index using the replace() primitive
    method.  You can pass either a single index, or a start and a length.

    If you pass a start and length that is beyond the
    length this method will throw an Ember.OUT_OF_RANGE_EXCEPTION

        var colors = ["red", "green", "blue", "yellow", "orange"];
        colors.removeAt(0); => ["green", "blue", "yellow", "orange"]
        colors.removeAt(2, 2); => ["green", "blue"]
        colors.removeAt(4, 2); => Error: Index out of range

    @param {Number} start index, start of range
    @param {Number} len length of passing range
    @returns {Object} receiver
  */
  removeAt: function(start, len) {

    var delta = 0;

    if ('number' === typeof start) {

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new Error(OUT_OF_RANGE_EXCEPTION);
      }

      // fast case
      if (len === undefined) len = 1;
      this.replace(start, len, EMPTY);
    }

    return this ;
  },

  /**
    Push the object onto the end of the array.  Works just like push() but it
    is KVO-compliant.

        var colors = ["red", "green", "blue"];
        colors.pushObject("black"); => ["red", "green", "blue", "black"]
        colors.pushObject(["yellow", "orange"]); => ["red", "green", "blue", "black", ["yellow", "orange"]]

  */
  pushObject: function(obj) {
    this.insertAt(get(this, 'length'), obj) ;
    return obj ;
  },

  /**
    Add the objects in the passed numerable to the end of the array.  Defers
    notifying observers of the change until all objects are added.

        var colors = ["red", "green", "blue"];
        colors.pushObjects("black"); => ["red", "green", "blue", "black"]
        colors.pushObjects(["yellow", "orange"]); => ["red", "green", "blue", "black", "yellow", "orange"]

    @param {Ember.Enumerable} objects the objects to add
    @returns {Ember.Array} receiver
  */
  pushObjects: function(objects) {
    this.replace(get(this, 'length'), 0, objects);
    return this;
  },

  /**
    Pop object from array or nil if none are left.  Works just like pop() but
    it is KVO-compliant.

        var colors = ["red", "green", "blue"];
        colors.popObject(); => "blue"
        console.log(colors); => ["red", "green"]

  */
  popObject: function() {
    var len = get(this, 'length') ;
    if (len === 0) return null ;

    var ret = this.objectAt(len-1) ;
    this.removeAt(len-1, 1) ;
    return ret ;
  },

  /**
    Shift an object from start of array or nil if none are left.  Works just
    like shift() but it is KVO-compliant.

        var colors = ["red", "green", "blue"];
        colors.shiftObject(); => "red"
        console.log(colors); => ["green", "blue"]

  */
  shiftObject: function() {
    if (get(this, 'length') === 0) return null ;
    var ret = this.objectAt(0) ;
    this.removeAt(0) ;
    return ret ;
  },

  /**
    Unshift an object to start of array.  Works just like unshift() but it is
    KVO-compliant.

        var colors = ["red", "green", "blue"];
        colors.unshiftObject("yellow"); => ["yellow", "red", "green", "blue"]
        colors.unshiftObject(["black", "white"]); => [["black", "white"], "yellow", "red", "green", "blue"]

  */
  unshiftObject: function(obj) {
    this.insertAt(0, obj) ;
    return obj ;
  },

  /**
    Adds the named objects to the beginning of the array.  Defers notifying
    observers until all objects have been added.

        var colors = ["red", "green", "blue"];
        colors.unshiftObjects(["black", "white"]); => ["black", "white", "red", "green", "blue"]
        colors.unshiftObjects("yellow"); => Type Error: 'undefined' is not a function

    @param {Ember.Enumerable} objects the objects to add
    @returns {Ember.Array} receiver
  */
  unshiftObjects: function(objects) {
    this.replace(0, 0, objects);
    return this;
  },

  // ..........................................................
  // IMPLEMENT Ember.MutableEnumerable
  //

  /** @private (nodoc) */
  removeObject: function(obj) {
    var loc = get(this, 'length') || 0;
    while(--loc >= 0) {
      var curObject = this.objectAt(loc) ;
      if (curObject === obj) this.removeAt(loc) ;
    }
    return this ;
  },

  /** @private (nodoc) */
  addObject: function(obj) {
    if (!this.contains(obj)) this.pushObject(obj);
    return this ;
  }

});

