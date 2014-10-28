import MutableEnumerableTests from 'ember-runtime/tests/suites/mutable_enumerable';
import Set from "ember-runtime/system/set";
import {get} from "ember-metal/property_get";

MutableEnumerableTests.extend({

  name: 'Ember.Set',

  newObject: function(ary) {
    var ret;
    ary = ary ? ary.slice() : this.newFixture(3);

    ignoreDeprecation(function() {
      ret =  new Set();
      ret.addObjects(ary);
    });

    return ret;
  },

  mutate: function(obj) {
    ignoreDeprecation(function() {
      obj.addObject(get(obj, 'length')+1);
    });
  },

  toArray: function(obj) {
    var ret;

    ignoreDeprecation(function() {
      ret = obj.toArray ? obj.toArray() : obj.slice(); // make a copy.
    });

    return ret;
  }

}).run();
