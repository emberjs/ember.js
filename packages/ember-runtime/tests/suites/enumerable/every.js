// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

// ..........................................................
// every()
//

suite.module('every');

suite.test('every should should invoke callback on each item as long as you return true', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      found = [], result;

  result = obj.every(function(i) { found.push(i); return true; });
  equal(result, true, 'return value of obj.every');
  deepEqual(found, ary, 'items passed during every() should match');
});

suite.test('every should stop invoking when you return false', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      cnt = ary.length - 2,
      exp = cnt,
      found = [], result;

  result = obj.every(function(i) { found.push(i); return --cnt>0; });
  equal(result, false, 'return value of obj.every');
  equal(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0,-2), 'items passed during every() should match');
});

// ..........................................................
// everyProperty()
//

suite.module('everyProperty');

suite.test('should return true of every property matches', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    Ember.Object.create({ foo: 'foo', bar: 'bar' })
  ]);

  equal(obj.everyProperty('foo', 'foo'), true, 'everyProperty(foo)');
  equal(obj.everyProperty('bar', 'bar'), false, 'everyProperty(bar)');
});

suite.test('should return true of every property is true', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: true },
    Ember.Object.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  equal(obj.everyProperty('foo'), true, 'everyProperty(foo)');
  equal(obj.everyProperty('bar'), false, 'everyProperty(bar)');
});

suite.test('should return true if every property matches null', function() {
  var obj = this.newObject([
    { foo: null, bar: 'BAZ' },
    Ember.Object.create({ foo: null, bar: null })
  ]);

  equal(obj.everyProperty('foo', null), true, "everyProperty('foo', null)");
  equal(obj.everyProperty('bar', null), false, "everyProperty('bar', null)");
});

suite.test('should return true if every property is undefined', function() {
  var obj = this.newObject([
    { foo: undefined, bar: 'BAZ' },
    Ember.Object.create({ bar: undefined })
  ]);

  equal(obj.everyProperty('foo', undefined), true, "everyProperty('foo', undefined)");
  equal(obj.everyProperty('bar', undefined), false, "everyProperty('bar', undefined)");
});
