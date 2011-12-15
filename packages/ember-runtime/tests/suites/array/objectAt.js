// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/array');

var suite = Ember.ArrayTests;

suite.module('objectAt');

suite.test("should return object at specified index", function() {
  var expected = this.newFixture(3),
      obj      = this.newObject(expected),
      len      = expected.length,
      idx;
      
  for(idx=0;idx<len;idx++) {
    equals(obj.objectAt(idx), expected[idx], Ember.String.fmt('obj.objectAt(%@) should match', [idx]));
  }
  
});

suite.test("should return undefined when requesting objects beyond index", function() {
  var obj;
  
  obj = this.newObject(this.newFixture(3));
  equals(obj.objectAt(5), undefined, 'should return undefined for obj.objectAt(5) when len = 3');
  
  obj = this.newObject([]);
  equals(obj.objectAt(0), undefined, 'should return undefined for obj.objectAt(0) when len = 0');
});


