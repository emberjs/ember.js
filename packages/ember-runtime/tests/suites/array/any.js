import { SuiteModuleBuilder } from '../suite';
import { A as emberA } from '../../../mixins/array';

const suite = SuiteModuleBuilder.create();

// ..........................................................
// any()
//

suite.module('any');

suite.test('any should should invoke callback on each item as long as you return false', function(assert) {
  let obj = this.newObject();
  let ary = this.toArray(obj);
  let found = [];
  let result;

  result = obj.any(function(i) {
    found.push(i);
    return false;
  });
  assert.equal(result, false, 'return value of obj.any');
  assert.deepEqual(found, ary, 'items passed during any() should match');
});

suite.test('any should stop invoking when you return true', function(assert) {
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
  assert.equal(result, true, 'return value of obj.any');
  assert.equal(found.length, exp, 'should invoke proper number of times');
  assert.deepEqual(found, ary.slice(0, -2), 'items passed during any() should match');
});

suite.test('any should return true if any object matches the callback', function(assert) {
  let obj = emberA([0, 1, 2]);
  let result;

  result = obj.any(i => !!i);
  assert.equal(result, true, 'return value of obj.any');
});

suite.test('any should return false if no object matches the callback', function(assert) {
  let obj = emberA([0, null, false]);
  let result;

  result = obj.any(i => !!i);
  assert.equal(result, false, 'return value of obj.any');
});

suite.test('any should produce correct results even if the matching element is undefined', function(assert) {
  let obj = emberA([undefined]);
  let result;

  result = obj.any(() => true);
  assert.equal(result, true, 'return value of obj.any');
});

export default suite;
