import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class CompactTests extends AbstractTestCase {
  '@test removes null and undefined values from enumerable'() {
    let obj = this.newObject([null, 1, false, '', undefined, 0, null]);
    let ary = obj.compact();
    this.assert.deepEqual(ary, [1, false, '', 0]);
  }
}

runArrayTests('compact', CompactTests);
