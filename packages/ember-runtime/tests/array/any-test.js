import { A as emberA } from '../../mixins/array';
import { AbstractTestCase } from 'internal-test-helpers';
import {
  runArrayTests
} from '../helpers/array';

class AnyTests extends AbstractTestCase {
  '@test any should should invoke callback on each item as long as you return false'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let found = [];
    let result;

    result = obj.any(function(i) {
      found.push(i);
      return false;
    });

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

    result = obj.any(function(i) {
      found.push(i);
      return --cnt <= 0;
    });
    this.assert.equal(result, true, 'return value of obj.any');
    this.assert.equal(found.length, exp, 'should invoke proper number of times');
    this.assert.deepEqual(found, ary.slice(0, -2), 'items passed during any() should match');
  }

  '@test any should return true if any object matches the callback'() {
    let obj = emberA([0, 1, 2]);
    let result;

    result = obj.any(i => !!i);
    this.assert.equal(result, true, 'return value of obj.any');
  }

  '@test any should produce correct results even if the matching element is undefined'(assert) {
    let obj = emberA([undefined]);
    let result;

    result = obj.any(() => true);
    assert.equal(result, true, 'return value of obj.any');
  }
}

runArrayTests('any', AnyTests);