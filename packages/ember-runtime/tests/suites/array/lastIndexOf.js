// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/array');

var suite = Ember.ArrayTests;

suite.module('lastIndexOf');

suite.test("should return index of object's last occurrence", function() {
  var expected = this.newFixture(3),
      obj      = this.newObject(expected),
      len      = 3,
      idx;

  for(idx=0;idx<len;idx++) {
    equal(obj.lastIndexOf(expected[idx]), idx,
      Ember.String.fmt('obj.lastIndexOf(%@) should match idx', [expected[idx]]));
  }

});

suite.test("should return index of object's last occurrence even startAt search location is equal to length", function() {
  var expected = this.newFixture(3),
      obj      = this.newObject(expected),
      len      = 3,
      idx;

  for(idx=0;idx<len;idx++) {
    equal(obj.lastIndexOf(expected[idx], len), idx,
      Ember.String.fmt('obj.lastIndexOfs(%@) should match idx', [expected[idx]]));
  }

});

suite.test("should return index of object's last occurrence even startAt search location is greater than length", function() {
  var expected = this.newFixture(3),
      obj      = this.newObject(expected),
      len      = 3,
      idx;

  for(idx=0;idx<len;idx++) {
    equal(obj.lastIndexOf(expected[idx], len + 1), idx,
      Ember.String.fmt('obj.lastIndexOf(%@) should match idx', [expected[idx]]));
  }

});

suite.test("should return -1 when no match is found", function() {
  var obj = this.newObject(this.newFixture(3)), foo = {};
  equal(obj.lastIndexOf(foo), -1, 'obj.lastIndexOf(foo) should be -1');
});

suite.test("should return -1 when no match is found even startAt search location is equal to length", function() {
  var obj = this.newObject(this.newFixture(3)), foo = {};
  equal(obj.lastIndexOf(foo, obj.length), -1, 'obj.lastIndexOf(foo) should be -1');
});

suite.test("should return -1 when no match is found even startAt search location is greater than length", function() {
  var obj = this.newObject(this.newFixture(3)), foo = {};
  equal(obj.lastIndexOf(foo, obj.length + 1), -1, 'obj.lastIndexOf(foo) should be -1');
});
