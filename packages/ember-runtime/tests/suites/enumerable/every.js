import EmberObject from '../../../system/object';
import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

// ..........................................................
// every()
//

suite.module('every');

suite.test('every should should invoke callback on each item as long as you return true', function(assert) {
  let obj = this.newObject();
  let ary = this.toArray(obj);
  let found = [];
  let result;

  result = obj.every(function(i) {
    found.push(i);
    return true;
  });
  assert.equal(result, true, 'return value of obj.every');
  assert.deepEqual(found, ary, 'items passed during every() should match');
});

suite.test('every should stop invoking when you return false', function(assert) {
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
  assert.equal(result, false, 'return value of obj.every');
  assert.equal(found.length, exp, 'should invoke proper number of times');
  assert.deepEqual(found, ary.slice(0, -2), 'items passed during every() should match');
});

// ..........................................................
// isEvery()
//

suite.module('isEvery');

suite.test('should return true of every property matches', function(assert) {
  let obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    EmberObject.create({ foo: 'foo', bar: 'bar' })
  ]);

  assert.equal(obj.isEvery('foo', 'foo'), true, 'isEvery(foo)');
  assert.equal(obj.isEvery('bar', 'bar'), false, 'isEvery(bar)');
});

suite.test('should return true of every property is true', function(assert) {
  let obj = this.newObject([
    { foo: 'foo', bar: true },
    EmberObject.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  assert.equal(obj.isEvery('foo'), true, 'isEvery(foo)');
  assert.equal(obj.isEvery('bar'), false, 'isEvery(bar)');
});

suite.test('should return true if every property matches null', function(assert) {
  let obj = this.newObject([
    { foo: null, bar: 'BAZ' },
    EmberObject.create({ foo: null, bar: null })
  ]);

  assert.equal(obj.isEvery('foo', null), true, 'isEvery(\'foo\', null)');
  assert.equal(obj.isEvery('bar', null), false, 'isEvery(\'bar\', null)');
});

suite.test('should return true if every property is undefined', function(assert) {
  let obj = this.newObject([
    { foo: undefined, bar: 'BAZ' },
    EmberObject.create({ bar: undefined })
  ]);

  assert.equal(obj.isEvery('foo', undefined), true, 'isEvery(\'foo\', undefined)');
  assert.equal(obj.isEvery('bar', undefined), false, 'isEvery(\'bar\', undefined)');
});

export default suite;
