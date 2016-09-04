import { A as emberA } from '../../../system/native_array';
import MutableArrayTests from '../../suites/mutable_array';

MutableArrayTests.extend({
  name: 'Native Array',

  newObject(ary) {
    return emberA(ary ? ary.slice() : this.newFixture(3));
  },

  mutate(obj) {
    obj.pushObject(obj.length + 1);
  },

  toArray(obj) {
    return obj.slice(); // make a copy.
  }
}).run();
