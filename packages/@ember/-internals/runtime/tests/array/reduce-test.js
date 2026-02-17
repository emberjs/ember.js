import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class ReduceTests extends AbstractTestCase {
  '@test collects a summary value from an enumeration'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item) => previousValue + item, 0);
    this.assert.equal(res, 6);
  }

  '@test uses the first item as the initial accumulator when not provided'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item) => previousValue + item);
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

  '@test throws when called on an empty array without an initial value'() {
    let obj = this.newObject([]);

    this.assert.throws(
      () => obj.reduce(() => 0),
      /Reduce of empty array with no initial value/
    );
  }
}

runArrayTests('reduce', ReduceTests);
