// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/array');

var suite = SC.ArrayTests;

suite.module('indexOf');

suite.test("should return index of object", function() {
  var expected = this.newFixture(3),
      obj      = this.newObject(expected),
      len      = 3,
      idx;
      
  for(idx=0;idx<len;idx++) {
    equals(obj.indexOf(expected[idx]), idx, SC.String.fmt('obj.indexOf(%@) should match idx', expected[idx]));
  }
  
});

suite.test("should return -1 when requesting object not in index", function() {
  var obj = this.newObject(this.newFixture(3)), foo = {};
  equals(obj.indexOf(foo), -1, 'obj.indexOf(foo) should be < 0');
});

