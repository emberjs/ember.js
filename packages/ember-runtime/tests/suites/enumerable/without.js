// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('without');

suite.test('should return new instance with item removed', function() {
  var before, after, obj, ret;
  
  before = this.newFixture(3);
  after  = [before[0], before[2]];
  obj    = this.newObject(before);
  
  ret = obj.without(before[1]);
  same(this.toArray(ret), after, 'should have removed item');
  same(this.toArray(obj), before, 'should not have changed original');
});

suite.test('should return same instance if object not found', function() {
  var item, obj, ret;
  
  item   = this.newFixture(1)[0];
  obj    = this.newObject(this.newFixture(3));
  
  ret = obj.without(item);
  equals(ret, obj, 'should be same instance');
});

