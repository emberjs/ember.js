import { AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class CompactTests extends AbstractTestCase {
  '@test removes null and undefined values from enumerable'() {
    let obj = this.newObject([null, 1, false, '', undefined, 0, null]);
    let ary;
    expectDeprecation(() => {
      ary = obj.compact();
    }, /Usage of Ember.Array methods is deprecated/);
    this.assert.deepEqual(ary, [1, false, '', 0]);
  }
}

runArrayTests('compact', CompactTests);
