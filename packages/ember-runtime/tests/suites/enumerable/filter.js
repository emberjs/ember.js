// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');
require('ember-runtime/mixins/comparable');

var suite = Ember.EnumerableTests;

// ..........................................................
// filter()
// 

suite.module('filter');

suite.test('filter should invoke on each item', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      cnt = ary.length - 2,
      found = [], result;

  // return true on all but the last two
  result = obj.filter(function(i) { found.push(i); return --cnt>=0; });
  same(found, ary, 'should have invoked on each item');
  same(result, ary.slice(0,-2), 'filtered array should exclude items');
});

// ..........................................................
// filterProperty()
// 

suite.module('filterProperty');

suite.test('should filter based on object', function() {
  var obj, ary;
  
  ary = [
    { foo: 'foo', bar: 'BAZ' }, 
    Ember.Object.create({ foo: 'foo', bar: 'bar' })
  ];
  
  obj = this.newObject(ary);
  
  same(obj.filterProperty('foo', 'foo'), ary, 'filterProperty(foo)');
  same(obj.filterProperty('bar', 'bar'), [ary[1]], 'filterProperty(bar)');
});

suite.test('should include in result if property is true', function() {
  var obj, ary;
  
  ary = [
    { foo: 'foo', bar: true }, 
    Ember.Object.create({ foo: 'bar', bar: false })
  ];
  
  obj = this.newObject(ary);

  // different values - all eval to true
  same(obj.filterProperty('foo'), ary, 'filterProperty(foo)');
  same(obj.filterProperty('bar'), [ary[0]], 'filterProperty(bar)');
});
