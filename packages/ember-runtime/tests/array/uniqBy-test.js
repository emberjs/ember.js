import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class UniqByTests extends AbstractTestCase {
  '@test should return new instance with duplicates removed'() {
    let numbers = this.newObject([
      { id: 1, value: 'one' },
      { id: 2, value: 'two' },
      { id: 1, value: 'one' }
    ]);
    this.assert.deepEqual(numbers.uniqBy('id'), [
      { id: 1, value: 'one' },
      { id: 2, value: 'two' }
    ]);
  }
}

runArrayTests('uniqBy', UniqByTests);