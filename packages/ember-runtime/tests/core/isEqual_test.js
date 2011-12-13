// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// Ember.isEqual Tests
// ========================================================================
/*globals module test */

module("isEqual");

test("undefined and null", function() {
  ok(  Ember.isEqual(undefined, undefined), "undefined is equal to undefined" );
  ok( !Ember.isEqual(undefined, null),      "undefined is not equal to null" );
  ok(  Ember.isEqual(null, null),           "null is equal to null" );
  ok( !Ember.isEqual(null, undefined),      "null is not equal to undefined" );
});

test("strings should be equal",function(){
	ok( !Ember.isEqual("Hello", "Hi"),    "different Strings are unequal" );
	ok(  Ember.isEqual("Hello", "Hello"), "same Strings are equal" );
});

test("numericals should be equal",function(){
  ok(  Ember.isEqual(24, 24), "same numbers are equal" );
	ok( !Ember.isEqual(24, 21), "different numbers are inequal" );
});

test("array should be equal",function(){
	// NOTE: We don't test for array contents -- that would be too expensive.
	ok( !Ember.isEqual( [1,2], [1,2] ), 'two array instances with the same values should not be equal' );
	ok( !Ember.isEqual( [1,2], [1] ),   'two array instances with different values should not be equal' );
});

test("first object implements isEqual should use it", function() {
  ok(Ember.isEqual({ isEqual: function() { return true; } }, null), 'should return true always');
  
  var obj = { isEqual: function() { return false; } };
  equals(Ember.isEqual(obj, obj), false, 'should return false because isEqual returns false');
});


