import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class ToArrayTests extends AbstractTestCase {
  '@test toArray should convert to an array'() {
    let obj = this.newObject();
    this.assert.deepEqual(obj.toArray(), this.toArray(obj));
  }
}

runArrayTests('toArray', ToArrayTests);
