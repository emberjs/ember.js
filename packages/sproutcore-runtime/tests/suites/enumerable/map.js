// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/enumerable');

var suite = SC.EnumerableTests;

suite.module('map');

function mapFunc(item) { return item ? item.toString() : null; }

suite.test('map should iterate over list', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj).map(mapFunc),
      found = [];
      
  found = obj.map(mapFunc);
  same(found, ary, 'mapped arrays should match');
});


suite.test('map should iterate over list after mutation', function() {
  if (SC.get(this, 'canTestMutation')) return ;
  
  var obj = this.newObject(),
      ary = this.toArray(obj).map(mapFunc),
      found;
      
  found = obj.map(mapFunc);
  same(found, ary, 'items passed during forEach should match');
      
  this.mutate(obj);
  ary = this.toArray(obj).map(mapFunc);
  found = obj.map(mapFunc);
  same(found, ary, 'items passed during forEach should match');
});

suite.test('2nd target parameter', function() {
  var obj = this.newObject(), target = this;
  
  
  obj.map(function() { 
    equals(SC.guidFor(this), SC.guidFor(window), 'should pass window as this if no context');
  });

  obj.map(function() { 
    equals(SC.guidFor(this), SC.guidFor(target), 'should pass target as this if context');
  }, target);

});


suite.test('callback params', function() {
  var obj = this.newObject(), 
      ary = this.toArray(obj),
      loc = 0;
  
  
  obj.map(function(item, idx, enumerable) { 
    equals(item, ary[loc], 'item param');
    equals(idx, loc, 'idx param');
    equals(SC.guidFor(enumerable), SC.guidFor(obj), 'enumerable param');
    loc++;
  });

});
