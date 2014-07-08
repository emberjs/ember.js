import MutableEnumerableTests from 'ember-runtime/tests/suites/mutable_enumerable';
import Set from "ember-runtime/system/set";
import {get} from "ember-metal/property_get";

MutableEnumerableTests.extend({

  name: 'Ember.Set',

  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    var ret = new Set();
    ret.addObjects(ary);
    return ret;
  },

  mutate: function(obj) {
    obj.addObject(get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice(); // make a copy.
  }

}).run();
