import Ember from 'ember-metal/core';
import MutableArrayTests from 'ember-runtime/tests/suites/mutable_array';
import ArrayProxy from "ember-runtime/system/array_proxy";
import {get} from "ember-metal/property_get";

MutableArrayTests.extend({

  name: 'Ember.ArrayProxy',

  newObject(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return ArrayProxy.create({ content: Ember.A(ret) });
  },

  mutate(obj) {
    obj.pushObject(get(obj, 'length')+1);
  },

  toArray(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }

}).run();
