import MutableArrayTests from '../../suites/mutable_array';
import ArrayProxy from '../../../system/array_proxy';
import { get } from 'ember-metal';
import { A as emberA } from '../../../system/native_array';

MutableArrayTests.extend({
  name: 'Ember.ArrayProxy',

  newObject(ary) {
    let ret = ary ? ary.slice() : this.newFixture(3);
    return ArrayProxy.create({ content: emberA(ret) });
  },

  mutate(obj) {
    obj.pushObject(get(obj, 'length') + 1);
  },

  toArray(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}).run();
