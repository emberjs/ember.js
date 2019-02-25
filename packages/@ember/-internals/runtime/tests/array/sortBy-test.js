import { get } from '@ember/-internals/metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class SortByTests extends AbstractTestCase {
  '@test sort by value of property'() {
    let obj = this.newObject([{ a: 2 }, { a: 1 }]);
    let sorted = obj.sortBy('a');

    this.assert.equal(get(sorted[0], 'a'), 1);
    this.assert.equal(get(sorted[1], 'a'), 2);
  }

  '@test supports multiple propertyNames'() {
    let obj = this.newObject([{ a: 1, b: 2 }, { a: 1, b: 1 }]);
    let sorted = obj.sortBy('a', 'b');

    this.assert.equal(get(sorted[0], 'b'), 1);
    this.assert.equal(get(sorted[1], 'b'), 2);
  }
}

runArrayTests('sortBy', SortByTests);
