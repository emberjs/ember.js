// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/enumerable');

var suite = SC.EnumerableTests;

suite.module('uniq');

suite.test('should return new instance with duplicates removed', function() {
  var before, after, obj, ret;
  
  after  = this.newFixture(3);
  before = [after[0], after[1], after[2], after[1], after[0]];
  obj    = this.newObject(before);
  before = obj.toArray(); // in case of set before will be different...
  
  ret = obj.uniq();
  same(this.toArray(ret), after, 'should have removed item');
  same(this.toArray(obj), before, 'should not have changed original');
});

suite.test('should return same content if no duplicates found', function() {
  var item, obj, ret;
  obj = this.newObject(this.newFixture(3));
  ret = obj.uniq(item);
  same(this.toArray(ret), this.toArray(obj), 'should be same content');
});

