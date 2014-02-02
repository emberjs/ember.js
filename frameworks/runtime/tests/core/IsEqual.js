// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.isEqual Tests
// ========================================================================
/*globals module test */

module("isEqual");

test("undefined and null", function() {
  ok(  SC.isEqual(undefined, undefined), "undefined is equal to undefined" );
  ok( !SC.isEqual(undefined, null),      "undefined is not equal to null" );
  ok(  SC.isEqual(null, null),           "null is equal to null" );
  ok( !SC.isEqual(null, undefined),      "null is not equal to undefined" );
})

test("strings should be equal",function(){
	ok( !SC.isEqual("Hello", "Hi"),    "different Strings are unequal" );
	ok(  SC.isEqual("Hello", "Hello"), "same Strings are equal" );
});

test("numericals should be equal",function(){
  ok(  SC.isEqual(24, 24), "same numbers are equal" );
	ok( !SC.isEqual(24, 21), "different numbers are inequal" );
});

test("array should be equal",function(){
	// NOTE: We don't test for array contents -- that would be too expensive.
	ok( !SC.isEqual( [1,2], [1,2] ), 'two array instances with the same values should not be equal' );
	ok( !SC.isEqual( [1,2], [1] ),   'two array instances with different values should not be equal' );
});

