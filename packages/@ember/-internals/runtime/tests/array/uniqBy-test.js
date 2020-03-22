import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class UniqByTests extends AbstractTestCase {
  '@test should return new instance with duplicates removed'() {
    let numbers = this.newObject([
      { id: 1, value: 'one' },
      { id: 2, value: 'two' },
      { id: 1, value: 'one' },
    ]);
    this.assert.deepEqual(numbers.uniqBy('id'), [{ id: 1, value: 'one' }, { id: 2, value: 'two' }]);
  }

  '@test supports function as key'() {
    let numbers = this.newObject([
      { id: 1, value: 'boom' },
      { id: 2, value: 'boom' },
      { id: 1, value: 'doom' },
    ]);

    let keyFunction = val => {
      this.assert.equal(arguments.length, 1);
      return val.value;
    };

    this.assert.deepEqual(numbers.uniqBy(keyFunction), [
      { id: 1, value: 'boom' },
      { id: 1, value: 'doom' },
    ]);
  }
}

runArrayTests('uniqBy', UniqByTests);
