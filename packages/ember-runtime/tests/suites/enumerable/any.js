import { SuiteModuleBuilder } from '../suite';
import { A as emberA } from '../../../system/native_array';

const suite = SuiteModuleBuilder.create();

// ..........................................................
// any()
//

suite.module('any');

suite.test('any should should invoke callback on each item as long as you return false', function() {
  let obj = this.newObject();
  let ary = this.toArray(obj);
  let found = [];
  let result;

  result = obj.any(function(i) {
    found.push(i);
    return false;
  });
  equal(result, false, 'return value of obj.any');
  deepEqual(found, ary, 'items passed during any() should match');
});

suite.test('any should stop invoking when you return true', function() {
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
  equal(result, true, 'return value of obj.any');
  equal(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0, -2), 'items passed during any() should match');
});

suite.test('any should return true if any object matches the callback', function() {
  let obj = emberA([0, 1, 2]);
  let result;

  result = obj.any(i => !!i);
  equal(result, true, 'return value of obj.any');
});

suite.test('any should return false if no object matches the callback', function() {
  let obj = emberA([0, null, false]);
  let result;

  result = obj.any(i => !!i);
  equal(result, false, 'return value of obj.any');
});

suite.test('any should produce correct results even if the matching element is undefined', function() {
  let obj = emberA([undefined]);
  let result;

  result = obj.any(i => true);
  equal(result, true, 'return value of obj.any');
});

export default suite;
