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

  '@test works without initialValue, using first element as initial value'() {
    let obj = this.newObject([1, 2, 3]);
    let res = obj.reduce((previousValue, item) => previousValue + item);
    this.assert.equal(res, 6);
  }

  '@test works without initialValue, starting from second element'() {
    let obj = this.newObject([10, 20, 30]);
    let indices: number[] = [];
    let res = obj.reduce((previousValue, item, index) => {
      indices.push(index);
      return previousValue + item;
    });
    this.assert.equal(res, 60);
    // Should start from index 1 (second element), not 0
    this.assert.deepEqual(indices, [1, 2]);
  }

  '@test throws error when called without initialValue on empty array'() {
    let obj = this.newObject([]);
    this.assert.throws(() => {
      obj.reduce((previousValue, item) => previousValue + item);
    }, /Reduce of empty array with no initial value/);
  }

  '@test works with single element array without initialValue'() {
    let obj = this.newObject([42]);
    let res = obj.reduce((previousValue, item) => previousValue + item);
    this.assert.equal(res, 42);
  }
}

runArrayTests('reduce', ReduceTests);
