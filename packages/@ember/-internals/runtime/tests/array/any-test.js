import {
  AbstractTestCase,
  emberAWithoutDeprecation as emberA,
  expectDeprecation,
} from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class AnyTests extends AbstractTestCase {
  '@test any should should invoke callback on each item as long as you return false'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let found = [];
    let result;

    expectDeprecation(() => {
      result = obj.any(function (i) {
        found.push(i);
        return false;
      });
    }, /Usage of Ember.Array methods is deprecated/);

    this.assert.equal(result, false, 'return value of obj.any');
    this.assert.deepEqual(found, ary, 'items passed during any() should match');
  }

  '@test any should stop invoking when you return true'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let cnt = ary.length - 2;
    let exp = cnt;
    let found = [];
    let result;

    expectDeprecation(() => {
      result = obj.any(function (i) {
        found.push(i);
        return --cnt <= 0;
      });
    }, /Usage of Ember.Array methods is deprecated/);
    this.assert.equal(result, true, 'return value of obj.any');
    this.assert.equal(found.length, exp, 'should invoke proper number of times');
    this.assert.deepEqual(found, ary.slice(0, -2), 'items passed during any() should match');
  }

  '@test any should return true if any object matches the callback'() {
    let obj = emberA([0, 1, 2]);
    let result;

    expectDeprecation(() => {
      result = obj.any((i) => Boolean(i));
    }, /Usage of Ember.Array methods is deprecated/);
    this.assert.equal(result, true, 'return value of obj.any');
  }

  '@test any should produce correct results even if the matching element is undefined'(assert) {
    let obj = emberA([undefined]);
    let result;

    expectDeprecation(() => {
      result = obj.any(() => true);
    }, /Usage of Ember.Array methods is deprecated/);
    assert.equal(result, true, 'return value of obj.any');
  }
}

runArrayTests('any', AnyTests);
