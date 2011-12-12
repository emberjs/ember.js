// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember Type Checking");

test("Ember.typeOf", function() {
	var a = null,
	    arr = [1,2,3],
	    obj = {},
      object = Ember.Object.create({ method: function() {} });

  equals(Ember.typeOf(undefined),     'undefined', "item of type undefined");
  equals(Ember.typeOf(a),             'null',      "item of type null");
	equals(Ember.typeOf(arr),           'array',     "item of type array");
	equals(Ember.typeOf(obj),           'object',    "item of type object");
	equals(Ember.typeOf(object),        'instance',  "item of type instance");
	equals(Ember.typeOf(object.method), 'function',  "item of type function") ;
	equals(Ember.typeOf(Ember.Object),     'class',     "item of type class");
  equals(Ember.typeOf(new Error()),   'error',     "item of type error");
});

test("Ember.none", function() {
  var string = "string", fn = function() {};

  equals(true,  Ember.none(null),      "for null");
  equals(true,  Ember.none(undefined), "for undefined");
  equals(false, Ember.none(""),        "for an empty String");
  equals(false, Ember.none(true),      "for true");
  equals(false, Ember.none(false),     "for false");
  equals(false, Ember.none(string),    "for a String");
  equals(false, Ember.none(fn),        "for a Function");
  equals(false, Ember.none(0),         "for 0");
  equals(false, Ember.none([]),        "for an empty Array");
  equals(false, Ember.none({}),        "for an empty Object");
});

test("Ember.empty", function() {
  var string = "string", fn = function() {};

  equals(true,  Ember.empty(null),      "for null");
  equals(true,  Ember.empty(undefined), "for undefined");
  equals(true,  Ember.empty(""),        "for an empty String");
  equals(false, Ember.empty(true),      "for true");
  equals(false, Ember.empty(false),     "for false");
  equals(false, Ember.empty(string),    "for a String");
  equals(false, Ember.empty(fn),        "for a Function");
  equals(false, Ember.empty(0),         "for 0");
  equals(false, Ember.empty([]),        "for an empty Array");
  equals(false, Ember.empty({}),        "for an empty Object");
});

test("Ember.isArray" ,function(){
  var numarray      = [1,2,3],
      number        = 23,
      strarray      = ["Hello", "Hi"],
      string        = "Hello",
      object         = {},
      length        = {length: 12},
      fn            = function() {};

  equals( Ember.isArray(numarray), true,  "[1,2,3]" );
  equals( Ember.isArray(number),   false, "23" );
  equals( Ember.isArray(strarray), true,  '["Hello", "Hi"]' );
  equals( Ember.isArray(string),   false, '"Hello"' );
  equals( Ember.isArray(object),   false, "{}" );
  equals( Ember.isArray(length),   true,  "{length: 12}" );
  equals( Ember.isArray(window),   false, "window" );
  equals( Ember.isArray(fn),       false, "function() {}" );
});

