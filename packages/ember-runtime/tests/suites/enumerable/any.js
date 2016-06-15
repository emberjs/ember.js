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
  strictEqual(result, false, 'return value of obj.any');
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
  strictEqual(result, true, 'return value of obj.any');
  strictEqual(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0, -2), 'items passed during any() should match');
});


suite.test('any should return true if any object returns a truthy value for the callback', function() {
  var obj = emberA([0, 1, 2]);
  var result;

  result = obj.any(function(i) { return i; });
  strictEqual(result, true, 'return value of obj.any');
});


suite.test('any should return false if no object returns a truthy value for the callback', function() {
  var obj = emberA([0, null, false, undefined]);
  var result;

  result = obj.any(function(i) { return i; });
  strictEqual(result, false, 'return value of obj.any');
});


suite.test('any should produce correct results even if the matching element is undefined', function() {
  var obj = emberA([undefined]);
  var result;

  result = obj.any(function(i) { return true; });
  strictEqual(result, true, 'return value of obj.any');
});


export default suite;
