/**
@module ember
*/
import Ember, { // Ember.A circular
  replace,
  get,
  Mixin
} from 'ember-metal';
import { ENV } from 'ember-environment';
import EmberArray, {
  arrayContentDidChange,
  arrayContentWillChange
} from '../mixins/array';
import MutableArray from '../mixins/mutable_array';
import Observable from '../mixins/observable';
import Copyable from '../mixins/copyable';
import { assert } from 'ember-debug';
import { FROZEN_ERROR } from '../mixins/freezable';
import copy from '../copy';

// Add Ember.Array to Array.prototype. Remove methods with native
// implementations and supply some more optimized versions of generic methods
// because they are so common.

/**
  The NativeArray mixin contains the properties needed to make the native
  Array support Ember.MutableArray and all of its dependent APIs. Unless you
  have `EmberENV.EXTEND_PROTOTYPES` or `EmberENV.EXTEND_PROTOTYPES.Array` set to
  false, this will be applied automatically. Otherwise you can apply the mixin
  at anytime by calling `Ember.NativeArray.apply(Array.prototype)`.

  @class Ember.NativeArray
  @uses MutableArray
  @uses Observable
  @uses Ember.Copyable
  @public
*/
let NativeArray = Mixin.create(MutableArray, Observable, Copyable, {

  // because length is a built-in property we need to know to just get the
  // original property.
  get(key) {
    if ('number' === typeof key) {
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
    assert(FROZEN_ERROR, !this.isFrozen);
    assert('The third argument to replace needs to be an array.', objects === null || objects === undefined || Array.isArray(objects))

    // if we replaced exactly the same number of items, then pass only the
    // replaced range. Otherwise, pass the full remaining array length
    // since everything has shifted
    let len = objects ? get(objects, 'length') : 0;
    arrayContentWillChange(this, idx, amt, len);

    if (len === 0) {
      this.splice(idx, amt);
    } else {
      replace(this, idx, amt, objects);
    }

    arrayContentDidChange(this, idx, amt, len);
    return this;
  },

  // If you ask for an unknown property, then try to collect the value
  // from member items.
  unknownProperty(key, value) {
    let ret;// = this.reducedProperty(key, value);
    if (value !== undefined && ret === undefined) {
      ret = this[key] = value;
    }
    return ret;
  },

  indexOf: Array.prototype.indexOf,
  lastIndexOf: Array.prototype.lastIndexOf,

  copy(deep) {
    if (deep) {
      return this.map((item) => copy(item, true));
    }

    return this.slice();
  }
});

// Remove any methods implemented natively so we don't override them
const ignore = ['length'];
NativeArray.keys().forEach((methodName) => {
  if (Array.prototype[methodName]) {
    ignore.push(methodName);
  }
});

NativeArray = NativeArray.without(...ignore);

/**
  Creates an `Ember.NativeArray` from an Array-like object.
  Does not modify the original object's contents. Ember.A is not needed if
  `EmberENV.EXTEND_PROTOTYPES` is `true` (the default value). However,
  it is recommended that you use Ember.A when creating addons for
  ember or when you can not guarantee that `EmberENV.EXTEND_PROTOTYPES`
  will be `true`.

  Example

  ```app/components/my-component.js
  import Component from '@ember/component';

  export default Component.extend({
    tagName: 'ul',
    classNames: ['pagination'],

    init() {
      this._super(...arguments);

      if (!this.get('content')) {
        this.set('content', Ember.A());
        this.set('otherContent', Ember.A([1,2,3]));
      }
    }
  });
  ```

  @method A
  @static
  @for @ember/array
  @return {EmberArray}
  @public
*/
let A;

if (ENV.EXTEND_PROTOTYPES.Array) {
  NativeArray.apply(Array.prototype);
  A = arr => arr || [];
} else {
  A = arr => {
    if (!arr) { arr = []; }
    return EmberArray.detect(arr) ? arr : NativeArray.apply(arr);
  };
}

Ember.A = A;
export {
  A,
  NativeArray // TODO: only use default export
};
export default NativeArray;
