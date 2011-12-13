// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal');

module("Ember.guidFor");

var sameGuid = function(a, b, message) {
  equals( Ember.guidFor(a), Ember.guidFor(b), message );
};

var diffGuid = function(a, b, message) {
  ok( Ember.guidFor(a) !== Ember.guidFor(b), message);
};

var nanGuid = function(obj) {
  var type = typeof obj;
  ok( isNaN(parseInt(Ember.guidFor(obj), 0)), "guids for " + type + "don't parse to numbers");
};

test("Object", function() {
  var a = {}, b = {};

  sameGuid( a, a, "same object always yields same guid" );
  diffGuid( a, b, "different objects yield different guids" );
  nanGuid( a );
});

test("Object with prototype", function() {
  var Class = function() { };

  Ember.guidFor(Class.prototype);

  var a = new Class();
  var b = new Class();

  sameGuid( a, b , "without calling rewatch, objects copy the guid from their prototype");

  Ember.rewatch(a);
  Ember.rewatch(b);

  diffGuid( a, b, "after calling rewatch, objects don't share guids" );
});

test("strings", function() {
  var a = "string A", aprime = "string A", b = "String B";

  sameGuid( a, a,      "same string always yields same guid" );
  sameGuid( a, aprime, "identical strings always yield the same guid" );
  diffGuid( a, b,      "different strings yield different guids" );
  nanGuid( a );
});

test("numbers", function() {
  var a = 23, aprime = 23, b = 34;

  sameGuid( a, a,      "same numbers always yields same guid" );
  sameGuid( a, aprime, "identical numbers always yield the same guid" );
  diffGuid( a, b,      "different numbers yield different guids" );
  nanGuid( a );
});

test("numbers", function() {
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

