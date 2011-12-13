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
  equals(result, false, 'return value of obj.some');
  same(found, ary, 'items passed during some() should match');
});

suite.test('every should stop invoking when you return true', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      cnt = ary.length - 2, 
      exp = cnt, 
      found = [], result;
      
  result = obj.some(function(i) { found.push(i); return !(--cnt>0); });
  equals(result, true, 'return value of obj.some');
  equals(found.length, exp, 'should invoke proper number of times');
  same(found, ary.slice(0,-2), 'items passed during some() should match');
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
  
  equals(obj.someProperty('foo', 'foo'), true, 'someProperty(foo)');
  equals(obj.someProperty('bar', 'bar'), true, 'someProperty(bar)');
  equals(obj.someProperty('bar', 'BIFF'), false, 'someProperty(BIFF)');
});

suite.test('should return true of any property is true', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: true }, 
    Ember.Object.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  equals(obj.someProperty('foo'), true, 'someProperty(foo)');
  equals(obj.someProperty('bar'), true, 'someProperty(bar)');
  equals(obj.someProperty('BIFF'), false, 'someProperty(biff)');
});
