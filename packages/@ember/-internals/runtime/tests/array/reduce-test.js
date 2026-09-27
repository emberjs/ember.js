import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class ReduceTests extends AbstractTestCase {
  '@test collects a summary value from an enumeration'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item) => previousValue + item, 0);
    this.assert.equal(res, 6);
  }

  '@test passes index of item to callback'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item, index) => previousValue + index, 0);
    this.assert.equal(res, 3);
  }

  '@test passes enumerable object to callback'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item, index, enumerable) => enumerable, 0);
    this.assert.equal(res, obj);
  }

  '@test works without an initialValue'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item) => previousValue + item);
    this.assert.equal(res, 6);
  }

  '@test passes correct index when without an initialValue'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item, index) => previousValue + index);
    // starts at item 2 (index 1): 1 + 1 = 2
    // then item 3 (index 2): 2 + 2 = 4
    this.assert.equal(res, 4);
  }

  '@test throws a TypeError when reducing an empty array without an initialValue'() {
    let obj = this.newObject([]);
    this.assert.throws(
      () => {
        obj.reduce((previousValue, item) => previousValue + item);
      },
      TypeError,
      'Reduce of empty array with no initial value'
    );
  }
}

runArrayTests('reduce', ReduceTests);
