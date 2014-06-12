import {isEqual} from "ember-runtime/core";

QUnit.module("isEqual");

test("undefined and null", function() {
  ok(  isEqual(undefined, undefined), "undefined is equal to undefined" );
  ok( !isEqual(undefined, null),      "undefined is not equal to null" );
  ok(  isEqual(null, null),           "null is equal to null" );
  ok( !isEqual(null, undefined),      "null is not equal to undefined" );
});

test("strings should be equal",function() {
  ok( !isEqual("Hello", "Hi"),    "different Strings are unequal" );
  ok(  isEqual("Hello", "Hello"), "same Strings are equal" );
});

test("numericals should be equal",function() {
  ok(  isEqual(24, 24), "same numbers are equal" );
  ok( !isEqual(24, 21), "different numbers are inequal" );
});

test("dates should be equal",function() {
  ok (  isEqual(new Date(1985, 7, 22), new Date(1985, 7, 22)), "same dates are equal" );
  ok ( !isEqual(new Date(2014, 7, 22), new Date(1985, 7, 22)), "different dates are not equal" );
});

test("array should be equal",function() {
  // NOTE: We don't test for array contents -- that would be too expensive.
  ok( !isEqual( [1,2], [1,2] ), 'two array instances with the same values should not be equal' );
  ok( !isEqual( [1,2], [1] ),   'two array instances with different values should not be equal' );
});

test("first object implements isEqual should use it", function() {
  ok(isEqual({ isEqual: function() { return true; } }, null), 'should return true always');

  var obj = { isEqual: function() { return false; } };
  equal(isEqual(obj, obj), false, 'should return false because isEqual returns false');
});
