// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

// ..........................................................
// some()
//

suite.module('some');

suite.test('some should should invoke callback on each item as long as you return false', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      found = [], result;

  result = obj.some(function(i) { found.push(i); return false; });
  equal(result, false, 'return value of obj.some');
  deepEqual(found, ary, 'items passed during some() should match');
});

suite.test('every should stop invoking when you return true', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      cnt = ary.length - 2,
      exp = cnt,
      found = [], result;

  result = obj.some(function(i) { found.push(i); return --cnt <= 0; });
  equal(result, true, 'return value of obj.some');
  equal(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0,-2), 'items passed during some() should match');
});

// ..........................................................
// someProperty()
//

suite.module('someProperty');

suite.test('should return true of any property matches', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    Ember.Object.create({ foo: 'foo', bar: 'bar' })
  ]);

  equal(obj.someProperty('foo', 'foo'), true, 'someProperty(foo)');
  equal(obj.someProperty('bar', 'bar'), true, 'someProperty(bar)');
  equal(obj.someProperty('bar', 'BIFF'), false, 'someProperty(BIFF)');
});

suite.test('should return true of any property is true', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: true },
    Ember.Object.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  equal(obj.someProperty('foo'), true, 'someProperty(foo)');
  equal(obj.someProperty('bar'), true, 'someProperty(bar)');
  equal(obj.someProperty('BIFF'), false, 'someProperty(biff)');
});

suite.test('should return true if any property matches null', function() {
  var obj = this.newObject([
    { foo: null, bar: 'bar' },
    Ember.Object.create({ foo: 'foo', bar: null })
  ]);

  equal(obj.someProperty('foo', null), true, "someProperty('foo', null)");
  equal(obj.someProperty('bar', null), true, "someProperty('bar', null)");
});

suite.test('should return true if any property is undefined', function() {
  var obj = this.newObject([
    { foo: undefined, bar: 'bar' },
    Ember.Object.create({ foo: 'foo' })
  ]);

  equal(obj.someProperty('foo', undefined), true, "someProperty('foo', undefined)");
  equal(obj.someProperty('bar', undefined), true, "someProperty('bar', undefined)");
});

suite.test('should not match undefined properties without second argument', function() {
  var obj = this.newObject([
    { foo: undefined },
    Ember.Object.create({ })
  ]);

  equal(obj.someProperty('foo'), false, "someProperty('foo', undefined)");
});
