// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('map');

function mapFunc(item) { return item ? item.toString() : null; }

suite.test('map should iterate over list', function() {
  var obj = this.newObject(),
      ary = Ember.ArrayUtils.map(this.toArray(obj), mapFunc),
      found = [];

  found = obj.map(mapFunc);
  deepEqual(found, ary, 'mapped arrays should match');
});


suite.test('map should iterate over list after mutation', function() {
  if (Ember.get(this, 'canTestMutation')) {
    expect(0);
    return ;
  }

  var obj = this.newObject(),
      ary = this.toArray(obj).map(mapFunc),
      found;

  found = obj.map(mapFunc);
  deepEqual(found, ary, 'items passed during forEach should match');

  this.mutate(obj);
  ary = this.toArray(obj).map(mapFunc);
  found = obj.map(mapFunc);
  deepEqual(found, ary, 'items passed during forEach should match');
});

suite.test('2nd target parameter', function() {
  var obj = this.newObject(), target = this;


  obj.map(function() {
    equal(Ember.guidFor(this), Ember.guidFor(window), 'should pass window as this if no context');
  });

  obj.map(function() {
    equal(Ember.guidFor(this), Ember.guidFor(target), 'should pass target as this if context');
  }, target);

});


suite.test('callback params', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      loc = 0;


  obj.map(function(item, idx, enumerable) {
    equal(item, ary[loc], 'item param');
    equal(idx, loc, 'idx param');
    equal(Ember.guidFor(enumerable), Ember.guidFor(obj), 'enumerable param');
    loc++;
  });

});
