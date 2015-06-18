import Ember from 'ember-metal/core';
import { computed } from 'ember-metal/computed';
import MutableArrayTests from 'ember-runtime/tests/suites/mutable_array';
import MutableArray from 'ember-runtime/mixins/mutable_array';
import EmberObject from 'ember-runtime/system/object';

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
var TestMutableArray = EmberObject.extend(MutableArray, {

  _content: null,

  init(ary) {
    this._content = Ember.A(ary || []);
  },

  replace(idx, amt, objects) {

    var args = objects ? objects.slice() : [];
    var removeAmt = amt;
    var addAmt    = args.length;

    this.arrayContentWillChange(idx, removeAmt, addAmt);

    args.unshift(amt);
    args.unshift(idx);
    this._content.splice.apply(this._content, args);
    this.arrayContentDidChange(idx, removeAmt, addAmt);
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
