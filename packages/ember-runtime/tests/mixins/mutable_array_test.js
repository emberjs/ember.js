import { computed } from 'ember-metal';
import MutableArrayTests from '../suites/mutable_array';
import MutableArray from '../../mixins/mutable_array';
import EmberObject from '../../system/object';
import { A as emberA } from '../../system/native_array';
import {
  arrayContentDidChange,
  arrayContentWillChange
} from '../../mixins/array';

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
const TestMutableArray = EmberObject.extend(MutableArray, {

  _content: null,

  init(ary = []) {
    this._content = emberA(ary);
  },

  replace(idx, amt, objects) {
    let args = objects ? objects.slice() : [];
    let removeAmt = amt;
    let addAmt    = args.length;

    arrayContentWillChange(this, idx, removeAmt, addAmt);

    args.unshift(amt);
    args.unshift(idx);
    this._content.splice.apply(this._content, args);
    arrayContentDidChange(this, idx, removeAmt, addAmt);
    return this;
  },

  objectAt(idx) {
    return this._content[idx];
  },

  length: computed(function() {
    return this._content.length;
  }),

  slice() {
    return this._content.slice();
  }

});


MutableArrayTests.extend({

  name: 'Basic Mutable Array',

  newObject(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestMutableArray(ary);
  },

  // allows for testing of the basic enumerable after an internal mutation
  mutate(obj) {
    obj.addObject(this.getFixture(1)[0]);
  },

  toArray(obj) {
    return obj.slice();
  }

}).run();
