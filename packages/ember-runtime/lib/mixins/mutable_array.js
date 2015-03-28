/**
@module ember
@submodule ember-runtime
*/


// require('ember-runtime/mixins/array');
// require('ember-runtime/mixins/mutable_enumerable');

// ..........................................................
// CONSTANTS
//

var OUT_OF_RANGE_EXCEPTION = "Index out of range";
var EMPTY = [];

// ..........................................................
// HELPERS
//

import { get } from "ember-metal/property_get";
import { isArray } from "ember-metal/utils";
import EmberError from "ember-metal/error";
import {
  Mixin,
  required
} from "ember-metal/mixin";
import EmberArray from "ember-runtime/mixins/array";
import MutableEnumerable from "ember-runtime/mixins/mutable_enumerable";
import Enumerable from "ember-runtime/mixins/enumerable";
/**
  This mixin defines the API for modifying array-like objects. These methods
  can be applied only to a collection that keeps its items in an ordered set.
  It builds upon the Array mixin and adds methods to modify the array.
  Concrete implementations of this class include ArrayProxy and ArrayController.

  It is important to use the methods in this class to modify arrays so that
  changes are observable. This allows the binding system in Ember to function
  correctly.


  Note that an Array can change even if it does not implement this mixin.
  For example, one might implement a SparseArray that cannot be directly
  modified, but if its underlying enumerable changes, it will change also.

  @class MutableArray
  @namespace Ember
  @uses Ember.Array
  @uses Ember.MutableEnumerable
*/
export default Mixin.create(EmberArray, MutableEnumerable, {

  /**
    __Required.__ You must implement this method to apply this mixin.

    This is one of the primitives you must implement to support `Ember.Array`.
    You should replace amt objects started at idx with the objects in the
    passed array. You should also call `this.enumerableContentDidChange()`

    @method replace
    @param {Number} idx Starting index in the array to replace. If
      idx >= length, then append to the end of the array.
    @param {Number} amt Number of elements that should be removed from
      the array, starting at *idx*.
    @param {Array} objects An array of zero or more objects that should be
      inserted into the array at *idx*
  */
  replace: required(),

  /**
    Remove all elements from the array. This is useful if you
    want to reuse an existing array without having to recreate it.

    ```javascript
    var colors = ["red", "green", "blue"];
    color.length();   //  3
    colors.clear();   //  []
    colors.length();  //  0
    ```

    @method clear
    @return {Ember.Array} An empty Array.
  */
  clear: function () {
    var len = get(this, 'length');
    if (len === 0) {
      return this;
    }

    this.replace(0, len, EMPTY);
    return this;
  },

  /**
    This will use the primitive `replace()` method to insert an object at the
    specified index.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.insertAt(2, "yellow");  // ["red", "green", "yellow", "blue"]
    colors.insertAt(5, "orange");  // Error: Index out of range
    ```

    @method insertAt
    @param {Number} idx index of insert the object at.
    @param {Object} object object to insert
    @return {Ember.Array} receiver
  */
  insertAt: function(idx, object) {
    if (idx > get(this, 'length')) {
      throw new EmberError(OUT_OF_RANGE_EXCEPTION);
    }

    this.replace(idx, 0, [object]);
    return this;
  },

  /**
    Remove an object at the specified index using the `replace()` primitive
    method. You can pass either a single index, or a start and a length.

    If you pass a start and length that is beyond the
    length this method will throw an `OUT_OF_RANGE_EXCEPTION`.

    ```javascript
    var colors = ["red", "green", "blue", "yellow", "orange"];
    colors.removeAt(0);     // ["green", "blue", "yellow", "orange"]
    colors.removeAt(2, 2);  // ["green", "blue"]
    colors.removeAt(4, 2);  // Error: Index out of range
    ```

    @method removeAt
    @param {Number} start index, start of range
    @param {Number} len length of passing range
    @return {Ember.Array} receiver
  */
  removeAt: function(start, len) {
    if ('number' === typeof start) {

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new EmberError(OUT_OF_RANGE_EXCEPTION);
      }

      // fast case
      if (len === undefined) {
        len = 1;
      }

      this.replace(start, len, EMPTY);
    }

    return this;
  },

  /**
    Push the object onto the end of the array. Works just like `push()` but it
    is KVO-compliant.

    ```javascript
    var colors = ["red", "green"];
    colors.pushObject("black");     // ["red", "green", "black"]
    colors.pushObject(["yellow"]);  // ["red", "green", ["yellow"]]
    ```

    @method pushObject
    @param {*} obj object to push
    @return object same object passed as a param
  */
  pushObject: function(obj) {
    this.insertAt(get(this, 'length'), obj);
    return obj;
  },

  /**
    Add the objects in the passed numerable to the end of the array. Defers
    notifying observers of the change until all objects are added.

    ```javascript
    var colors = ["red"];
    colors.pushObjects(["yellow", "orange"]);  // ["red", "yellow", "orange"]
    ```

    @method pushObjects
    @param {Ember.Enumerable} objects the objects to add
    @return {Ember.Array} receiver
  */
  pushObjects: function(objects) {
    if (!(Enumerable.detect(objects) || isArray(objects))) {
      throw new TypeError("Must pass Ember.Enumerable to Ember.MutableArray#pushObjects");
    }
    this.replace(get(this, 'length'), 0, objects);
    return this;
  },

  /**
    Pop object from array or nil if none are left. Works just like `pop()` but
    it is KVO-compliant.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.popObject();   // "blue"
    console.log(colors);  // ["red", "green"]
    ```

    @method popObject
    @return object
  */
  popObject: function() {
    var len = get(this, 'length');
    if (len === 0) {
      return null;
    }

    var ret = this.objectAt(len-1);
    this.removeAt(len-1, 1);
    return ret;
  },

  /**
    Shift an object from start of array or nil if none are left. Works just
    like `shift()` but it is KVO-compliant.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.shiftObject();  // "red"
    console.log(colors);   // ["green", "blue"]
    ```

    @method shiftObject
    @return object
  */
  shiftObject: function() {
    if (get(this, 'length') === 0) {
      return null;
    }

    var ret = this.objectAt(0);
    this.removeAt(0);
    return ret;
  },

  /**
    Unshift an object to start of array. Works just like `unshift()` but it is
    KVO-compliant.

    ```javascript
    var colors = ["red"];
    colors.unshiftObject("yellow");    // ["yellow", "red"]
    colors.unshiftObject(["black"]);   // [["black"], "yellow", "red"]
    ```

    @method unshiftObject
    @param {*} obj object to unshift
    @return object same object passed as a param
  */
  unshiftObject: function(obj) {
    this.insertAt(0, obj);
    return obj;
  },

  /**
    Adds the named objects to the beginning of the array. Defers notifying
    observers until all objects have been added.

    ```javascript
    var colors = ["red"];
    colors.unshiftObjects(["black", "white"]);   // ["black", "white", "red"]
    colors.unshiftObjects("yellow"); // Type Error: 'undefined' is not a function
    ```

    @method unshiftObjects
    @param {Ember.Enumerable} objects the objects to add
    @return {Ember.Array} receiver
  */
  unshiftObjects: function(objects) {
    this.replace(0, 0, objects);
    return this;
  },

  /**
    Reverse objects in the array. Works just like `reverse()` but it is
    KVO-compliant.

    @method reverseObjects
    @return {Ember.Array} receiver
   */
  reverseObjects: function() {
    var len = get(this, 'length');
    if (len === 0) {
      return this;
    }

    var objects = this.toArray().reverse();
    this.replace(0, len, objects);
    return this;
  },

  /**
    Replace all the receiver's content with content of the argument.
    If argument is an empty array receiver will be cleared.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.setObjects(["black", "white"]);  // ["black", "white"]
    colors.setObjects([]);                  // []
    ```

    @method setObjects
    @param {Ember.Array} objects array whose content will be used for replacing
        the content of the receiver
    @return {Ember.Array} receiver with the new content
   */
  setObjects: function(objects) {
    if (objects.length === 0) {
      return this.clear();
    }

    var len = get(this, 'length');
    this.replace(0, len, objects);
    return this;
  },

  // ..........................................................
  // IMPLEMENT Ember.MutableEnumerable
  //

  /**
    Remove all occurrences of an object in the array.

    ```javascript
    var cities = ["Chicago", "Berlin", "Lima", "Chicago"];
    cities.removeObject("Chicago");  // ["Berlin", "Lima"]
    cities.removeObject("Lima");     // ["Berlin"]
    cities.removeObject("Tokyo")     // ["Berlin"]
    ```

    @method removeObject
    @param {*} obj object to remove
    @return {Ember.Array} receiver
  */
  removeObject: function(obj) {
    var loc = get(this, 'length') || 0;
    while (--loc >= 0) {
      var curObject = this.objectAt(loc);

      if (curObject === obj) {
        this.removeAt(loc);
      }
    }
    return this;
  },

  /**
    Push the object onto the end of the array if it is not already
    present in the array.

    ```javascript
    var cities = ["Chicago", "Berlin"];
    cities.addObject("Lima");    // ["Chicago", "Berlin", "Lima"]
    cities.addObject("Berlin");  // ["Chicago", "Berlin", "Lima"]
    ```

    @method addObject
    @param {*} obj object to add, if not already present
    @return {Ember.Array} receiver
  */
  addObject: function(obj) {
    if (!this.contains(obj)) {
      this.pushObject(obj);
    }

    return this;
  }

});
