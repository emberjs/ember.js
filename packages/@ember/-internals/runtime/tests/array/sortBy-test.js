import { get } from '@ember/object';
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
    let obj = this.newObject([
      { a: 1, b: 2 },
      { a: 1, b: 1 },
    ]);
    let sorted = obj.sortBy('a', 'b');

    this.assert.equal(get(sorted[0], 'b'), 1);
    this.assert.equal(get(sorted[1], 'b'), 2);
  }

  '@test sorts undefined first, then null, then values'() {
    let obj = this.newObject([{ a: 'b' }, { a: null }, { a: 'a' }, { a: undefined }]);
    let sorted = obj.sortBy('a');

    this.assert.deepEqual(
      sorted.map((item) => get(item, 'a')),
      [undefined, null, 'a', 'b']
    );
  }

  '@test sorts dates by time'() {
    let later = new Date(2020, 1, 1);
    let earlier = new Date(2010, 1, 1);
    let obj = this.newObject([{ a: later }, { a: earlier }]);
    let sorted = obj.sortBy('a');

    this.assert.strictEqual(get(sorted[0], 'a'), earlier);
    this.assert.strictEqual(get(sorted[1], 'a'), later);
  }
}

runArrayTests('sortBy', SortByTests);
