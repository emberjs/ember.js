import { SuiteModuleBuilder } from 'ember-runtime/tests/suites/suite';
import { A as emberA } from 'ember-runtime/system/native_array';

var suite = SuiteModuleBuilder.create();

// ..........................................................
// any()
//

suite.module('any');

suite.test('any should should invoke callback on each item as long as you return false', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);
  var found = [];
  var result;

  result = obj.any(function(i) {
    found.push(i);
    return false;
  });
  equal(result, false, 'return value of obj.any');
  deepEqual(found, ary, 'items passed during any() should match');
});

suite.test('any should stop invoking when you return true', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);
  var cnt = ary.length - 2;
  var exp = cnt;
  var found = [];
  var result;

  result = obj.any(function(i) {
    found.push(i);
    return --cnt <= 0;
  });
  equal(result, true, 'return value of obj.any');
  equal(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0, -2), 'items passed during any() should match');
});


suite.test('any should return true if any object matches the callback', function() {
  var obj = emberA([0, 1, 2]);
  var result;

  result = obj.any(function(i) { return !!i; });
  equal(result, true, 'return value of obj.any');
});


suite.test('any should return false if no object matches the callback', function() {
  var obj = emberA([0, null, false]);
  var result;

  result = obj.any(function(i) { return !!i; });
  equal(result, false, 'return value of obj.any');
});


suite.test('any should produce correct results even if the matching element is undefined', function() {
  var obj = emberA([undefined]);
  var result;

  result = obj.any(function(i) { return true; });
  equal(result, true, 'return value of obj.any');
});


export default suite;
