import MutableArrayTests from '../suites/mutable_array';
import MutableArray from '../../mixins/mutable_array';
import EmberObject from '../../system/object';
import {
  arrayContentDidChange,
  arrayContentWillChange
} from '../../mixins/array';

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
class TestMutableArray extends EmberObject.extend(MutableArray) {
  constructor(arr) {
    super();
    this._content = Array.isArray(arr) ? arr : [];
  }

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
  }

  objectAt(idx) {
    return this._content[idx];
  }

  get length() {
    return this._content.length;
  }

  slice() {
    return this._content.slice();
  }
}

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
