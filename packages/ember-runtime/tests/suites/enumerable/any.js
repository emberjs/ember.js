import Ember from 'ember-metal/core';
import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

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
  var obj = Ember.A([0, 1, 2]);
  var result;

  result = obj.any(function(i) { return !!i; });
  equal(result, true, 'return value of obj.any');
});


suite.test('any should return false if no object matches the callback', function() {
  var obj = Ember.A([0, null, false]);
  var result;

  result = obj.any(function(i) { return !!i; });
  equal(result, false, 'return value of obj.any');
});


suite.test('any should produce correct results even if the matching element is undefined', function() {
  var obj = Ember.A([undefined]);
  var result;

  result = obj.any(function(i) { return true; });
  equal(result, true, 'return value of obj.any');
});


suite.test('any should be aliased to some', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);
  var anyFound = [];
  var someFound = [];
  var cnt = ary.length - 2;
  var anyResult, someResult;

  anyResult = obj.any(function(i) {
    anyFound.push(i);
    return false;
  });
  someResult = obj.some(function(i) {
    someFound.push(i);
    return false;
  });
  equal(someResult, anyResult);

  anyFound = [];
  someFound = [];

  cnt = ary.length - 2;
  anyResult = obj.any(function(i) {
    anyFound.push(i);
    return --cnt <= 0;
  });
  cnt = ary.length - 2;
  someResult = obj.some(function(i) {
    someFound.push(i);
    return --cnt <= 0;
  });

  equal(someResult, anyResult);
});

export default suite;
