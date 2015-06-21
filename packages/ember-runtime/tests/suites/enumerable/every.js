import EmberObject from 'ember-runtime/system/object';
import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

// ..........................................................
// every()
//

suite.module('every');

suite.test('every should should invoke callback on each item as long as you return true', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);
  var found = [];
  var result;

  result = obj.every(function(i) {
    found.push(i);
    return true;
  });
  equal(result, true, 'return value of obj.every');
  deepEqual(found, ary, 'items passed during every() should match');
});

suite.test('every should stop invoking when you return false', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);
  var cnt = ary.length - 2;
  var exp = cnt;
  var found = [];
  var result;

  result = obj.every(function(i) {
    found.push(i);
    return --cnt>0;
  });
  equal(result, false, 'return value of obj.every');
  equal(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0, -2), 'items passed during every() should match');
});

// ..........................................................
// isEvery()
//

suite.module('isEvery');

suite.test('should return true of every property matches', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    EmberObject.create({ foo: 'foo', bar: 'bar' })
  ]);

  equal(obj.isEvery('foo', 'foo'), true, 'isEvery(foo)');
  equal(obj.isEvery('bar', 'bar'), false, 'isEvery(bar)');
});

suite.test('should return true of every property is true', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: true },
    EmberObject.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  equal(obj.isEvery('foo'), true, 'isEvery(foo)');
  equal(obj.isEvery('bar'), false, 'isEvery(bar)');
});

suite.test('should return true if every property matches null', function() {
  var obj = this.newObject([
    { foo: null, bar: 'BAZ' },
    EmberObject.create({ foo: null, bar: null })
  ]);

  equal(obj.isEvery('foo', null), true, 'isEvery(\'foo\', null)');
  equal(obj.isEvery('bar', null), false, 'isEvery(\'bar\', null)');
});

suite.test('everyBy should be aliased to isEvery', function() {
  var obj = this.newObject();
  equal(obj.isEvery, obj.everyBy);
});

suite.test('everyProperty should be aliased to isEvery', function() {
  var obj = this.newObject();
  equal(obj.isEvery, obj.everyProperty);
});

suite.test('should return true if every property is undefined', function() {
  var obj = this.newObject([
    { foo: undefined, bar: 'BAZ' },
    EmberObject.create({ bar: undefined })
  ]);

  equal(obj.isEvery('foo', undefined), true, 'isEvery(\'foo\', undefined)');
  equal(obj.isEvery('bar', undefined), false, 'isEvery(\'bar\', undefined)');
});

export default suite;
