import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';
import EmberObject from '../../lib/system/object';

class EveryTest extends AbstractTestCase {
  '@test every should should invoke callback on each item as long as you return true'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let found = [];
    let result;

    result = obj.every(function(i) {
      found.push(i);
      return true;
    });
    this.assert.equal(result, true, 'return value of obj.every');
    this.assert.deepEqual(found, ary, 'items passed during every() should match');
  }

  '@test every should stop invoking when you return false'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let cnt = ary.length - 2;
    let exp = cnt;
    let found = [];
    let result;

    result = obj.every(function(i) {
      found.push(i);
      return --cnt > 0;
    });
    this.assert.equal(result, false, 'return value of obj.every');
    this.assert.equal(found.length, exp, 'should invoke proper number of times');
    this.assert.deepEqual(found, ary.slice(0, -2), 'items passed during every() should match');
  }
}

class IsEveryTest extends AbstractTestCase {
  '@test should return true of every property matches'() {
    let obj = this.newObject([
      { foo: 'foo', bar: 'BAZ' },
      EmberObject.create({ foo: 'foo', bar: 'bar' }),
    ]);

    this.assert.equal(obj.isEvery('foo', 'foo'), true, 'isEvery(foo)');
    this.assert.equal(obj.isEvery('bar', 'bar'), false, 'isEvery(bar)');
  }

  '@test should return true of every property is true'() {
    let obj = this.newObject([
      { foo: 'foo', bar: true },
      EmberObject.create({ foo: 'bar', bar: false }),
    ]);

    // different values - all eval to true
    this.assert.equal(obj.isEvery('foo'), true, 'isEvery(foo)');
    this.assert.equal(obj.isEvery('bar'), false, 'isEvery(bar)');
  }

  '@test should return true if every property matches null'() {
    let obj = this.newObject([
      { foo: null, bar: 'BAZ' },
      EmberObject.create({ foo: null, bar: null }),
    ]);

    this.assert.equal(obj.isEvery('foo', null), true, "isEvery('foo', null)");
    this.assert.equal(obj.isEvery('bar', null), false, "isEvery('bar', null)");
  }

  '@test should return true if every property is undefined'() {
    let obj = this.newObject([
      { foo: undefined, bar: 'BAZ' },
      EmberObject.create({ bar: undefined }),
    ]);

    this.assert.equal(obj.isEvery('foo', undefined), true, "isEvery('foo', undefined)");
    this.assert.equal(obj.isEvery('bar', undefined), false, "isEvery('bar', undefined)");
  }
}

runArrayTests('every', EveryTest);
runArrayTests('isEvery', IsEveryTest);
