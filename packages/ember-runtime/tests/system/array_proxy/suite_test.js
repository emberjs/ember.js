import MutableArrayTests from 'ember-runtime/tests/suites/mutable_array';
import ArrayProxy from 'ember-runtime/system/array_proxy';
import { get } from 'ember-metal/property_get';
import { A as emberA } from 'ember-runtime/system/native_array';

MutableArrayTests.extend({

  name: 'Ember.ArrayProxy',

  newObject(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return ArrayProxy.create({ content: emberA(ret) });
  },

  mutate(obj) {
    obj.pushObject(get(obj, 'length') + 1);
  },

  toArray(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }

}).run();
