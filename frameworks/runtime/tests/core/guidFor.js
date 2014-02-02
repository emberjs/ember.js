// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.guidFor Tests
// ========================================================================
/*globals module test ok isObj equals expects */

module("SC.guidFor");

var sameGuid = function(a, b, message) {
  equals( SC.guidFor(a), SC.guidFor(b), message );
}

var diffGuid = function(a, b, message) {
  ok( SC.guidFor(a) !== SC.guidFor(b), message);
}

var nanGuid = function(obj) {
  var type = SC.typeOf(obj);
  ok( isNaN(parseInt(SC.guidFor(obj), 0)), "guids for " + type + "don't parse to numbers")
}

test("Object", function() {
  var a = {}, b = {};

  sameGuid( a, a, "same object always yields same guid" );
  diffGuid( a, b, "different objects yield different guids" );
  nanGuid( a )
})

test("strings", function() {
  var a = "string A", aprime = "string A", b = "String B";

  sameGuid( a, a,      "same string always yields same guid" );
  sameGuid( a, aprime, "identical strings always yield the same guid" );
  diffGuid( a, b,      "different strings yield different guids" );
  nanGuid( a );
})

test("numbers", function() {
  var a = 23, aprime = 23, b = 34;

  sameGuid( a, a,      "same numbers always yields same guid" );
  sameGuid( a, aprime, "identical numbers always yield the same guid" );
  diffGuid( a, b,      "different numbers yield different guids" );
  nanGuid( a );
});

test("booleans", function() {
  var a = true, aprime = true, b = false;

  sameGuid( a, a,      "same booleans always yields same guid" );
  sameGuid( a, aprime, "identical booleans always yield the same guid" );
  diffGuid( a, b,      "different boolean yield different guids" );
  nanGuid( a );
  nanGuid( b );
});

test("null and undefined", function() {
  var a = null, aprime = null, b = undefined;

  sameGuid( a, a,      "null always returns the same guid" );
  sameGuid( b, b,      "undefined always returns the same guid" );
  sameGuid( a, aprime, "different nulls return the same guid" );
  diffGuid( a, b,      "null and undefined return different guids" );
  nanGuid( a );
  nanGuid( b );
});

test("arrays", function() {
  var a = ["a", "b", "c"], aprime = ["a", "b", "c"], b = ["1", "2", "3"];

  sameGuid( a, a,      "same instance always yields same guid" );
  diffGuid( a, aprime, "identical arrays always yield the same guid" );
  diffGuid( a, b,      "different arrays yield different guids" );
  nanGuid( a );
});

// QUESTION: do we need to hardcode the fact that hash == guid in the tests? [YK]
var obj1, obj2, str, arr;

module("SC.hashFor", {
  setup: function() {
    obj1 = {};
    obj2 = {
      hash: function() {
        return '%1234';
      }
    };
    str = "foo";
    arr = ['foo', 'bar'];
  }
});

test("One argument", function() {
  equals(SC.guidFor(obj1), SC.hashFor(obj1), "guidFor and hashFor should be equal for an obj1ect");
  equals(obj2.hash(), SC.hashFor(obj2), "hashFor should call the hash() function if present");
  equals(SC.guidFor(str), SC.hashFor(str), "guidFor and hashFor should be equal for a string");
  equals(SC.guidFor(arr), SC.hashFor(arr), "guidFor and hashFor should be equal for an array");
});

test("Multiple arguments", function() {
  var h = [
    SC.guidFor(obj1),
    obj2.hash(),
    SC.guidFor(str),
    SC.guidFor(arr)
  ].join('');

  equals(h, SC.hashFor(obj1, obj2, str, arr), "hashFor should concatenate the arguments' hashes when there are more than one");
});
