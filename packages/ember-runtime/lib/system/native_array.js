/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember-metal/core"; // Ember.EXTEND_PROTOTYPES

import { get } from "ember-metal/property_get";
import {
  _replace as replace,
  forEach
} from "ember-metal/enumerable_utils";
import { Mixin } from "ember-metal/mixin";
import { indexOf, lastIndexOf } from "ember-metal/array";
import EmberArray from "ember-runtime/mixins/array";
import MutableArray from "ember-runtime/mixins/mutable_array";
import Observable from "ember-runtime/mixins/observable";
import Copyable from "ember-runtime/mixins/copyable";
import { FROZEN_ERROR } from "ember-runtime/mixins/freezable";
import copy from "ember-runtime/copy";

// Add Ember.Array to Array.prototype. Remove methods with native
// implementations and supply some more optimized versions of generic methods
// because they are so common.

/**
  The NativeArray mixin contains the properties needed to make the native
  Array support Ember.MutableArray and all of its dependent APIs. Unless you
  have `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Array` set to
  false, this will be applied automatically. Otherwise you can apply the mixin
  at anytime by calling `Ember.NativeArray.activate`.

  @class NativeArray
  @namespace Ember
  @uses Ember.MutableArray
  @uses Ember.Observable
  @uses Ember.Copyable
*/
var NativeArray = Mixin.create(MutableArray, Observable, Copyable, {

  // because length is a built-in property we need to know to just get the
  // original property.
  get(key) {
    if (key==='length') {
      return this.length;
    } else if ('number' === typeof key) {
      return this[key];
    } else {
      return this._super(key);
    }
  },

  objectAt(idx) {
    return this[idx];
  },

  // primitive for array support.
  replace(idx, amt, objects) {

    if (this.isFrozen) {
      throw FROZEN_ERROR;
    }

    // if we replaced exactly the same number of items, then pass only the
    // replaced range. Otherwise, pass the full remaining array length
    // since everything has shifted
    var len = objects ? get(objects, 'length') : 0;
    this.arrayContentWillChange(idx, amt, len);

    if (len === 0) {
      this.splice(idx, amt);
    } else {
      replace(this, idx, amt, objects);
    }

    this.arrayContentDidChange(idx, amt, len);
    return this;
  },

  // If you ask for an unknown property, then try to collect the value
  // from member items.
  unknownProperty(key, value) {
    var ret;// = this.reducedProperty(key, value);
    if (value !== undefined && ret === undefined) {
      ret = this[key] = value;
    }
    return ret;
  },

  indexOf: indexOf,

  lastIndexOf: lastIndexOf,

  copy(deep) {
    if (deep) {
      return this.map(function(item) { return copy(item, true); });
    }

    return this.slice();
  }
});

// Remove any methods implemented natively so we don't override them
var ignore = ['length'];
forEach(NativeArray.keys(), function(methodName) {
  if (Array.prototype[methodName]) {
    ignore.push(methodName);
  }
});

NativeArray = NativeArray.without.apply(NativeArray, ignore);

/**
  Creates an `Ember.NativeArray` from an Array like object.
  Does not modify the original object. Ember.A is not needed if
  `Ember.EXTEND_PROTOTYPES` is `true` (the default value). However,
  it is recommended that you use Ember.A when creating addons for
  ember or when you can not guarantee that `Ember.EXTEND_PROTOTYPES`
  will be `true`.

  Example

  ```js
  var Pagination = Ember.CollectionView.extend({
    tagName: 'ul',
    classNames: ['pagination'],

    init: function() {
      this._super.apply(this, arguments);
      if (!this.get('content')) {
        this.set('content', Ember.A());
      }
    }
  });
  ```

  @method A
  @for Ember
  @return {Ember.NativeArray}
*/
var A = function(arr) {
  if (arr === undefined) { arr = []; }
  return EmberArray.detect(arr) ? arr : NativeArray.apply(arr);
};

/**
  Activates the mixin on the Array.prototype if not already applied. Calling
  this method more than once is safe. This will be called when ember is loaded
  unless you have `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Array`
  set to `false`.

  Example

  ```js
  if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Array) {
    Ember.NativeArray.activate();
  }
  ```

  @method activate
  @for Ember.NativeArray
  @static
  @return {void}
*/
NativeArray.activate = function() {
  NativeArray.apply(Array.prototype);

  A = function(arr) { return arr || []; };
};

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Array) {
  NativeArray.activate();
}

Ember.A = A; // ES6TODO: Setting A onto the object returned by ember-metal/core to avoid circles
export {
  A,
  NativeArray // TODO: only use default export
};
export default NativeArray;
