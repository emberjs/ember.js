import Ember from 'ember-metal/core';
import MutableArrayTests from 'ember-runtime/tests/suites/mutable_array';

MutableArrayTests.extend({

  name: 'Native Array',

  newObject(ary) {
    return Ember.A(ary ? ary.slice() : this.newFixture(3));
  },

  mutate(obj) {
    obj.pushObject(obj.length+1);
  },

  toArray(obj) {
    return obj.slice(); // make a copy.
  }

}).run();
