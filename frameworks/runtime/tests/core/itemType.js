// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
module("SproutCore Type Checking");

test("SC.typeOf", function() {
	var a = null,
	    arr = [1,2,3],
	    obj = {},
      object = SC.Object.create({ method: function() {} }),
      E = SC.Error.extend();

  equals(SC.T_UNDEFINED,  SC.typeOf(undefined),         "item of type undefined");
  equals(SC.T_NULL,       SC.typeOf(a),                 "item of type null");
	equals(SC.T_ARRAY,      SC.typeOf(arr),               "item of type array");
	equals(SC.T_HASH,       SC.typeOf(obj),               "item of type hash");
	equals(SC.T_OBJECT,     SC.typeOf(object),            "item of type object");
	equals(SC.T_FUNCTION,   SC.typeOf(object.method),     "item of type function") ;
	equals(SC.T_CLASS,      SC.typeOf(SC.Object),         "item of type class");
  equals(SC.T_ERROR,      SC.typeOf(SC.Error.create()), "item of type error");
  equals(SC.T_OBJECT,     SC.typeOf(SC.Object.create({ isError: YES })), "sc object with isError property should be of type object");
  equals(SC.T_ERROR,      SC.typeOf(E.create()),         "item of type error");
  equals(SC.T_HASH,       SC.typeOf({ isObject: YES }),  "hash object with isObject property should be of type hash");
});

test("SC.none", function() {
  var string = "string", fn = function() {};

	equals(true,  SC.none(null),      "for null");
	equals(true,  SC.none(undefined), "for undefined");
  equals(false, SC.none(""),        "for an empty String");
  equals(false, SC.none(true),      "for true");
  equals(false, SC.none(false),     "for false");
  equals(false, SC.none(string),    "for a String");
  equals(false, SC.none(fn),        "for a Function");
  equals(false, SC.none(0),         "for 0");
  equals(false, SC.none([]),        "for an empty Array");
  equals(false, SC.none({}),        "for an empty Object");
});

test("SC.empty", function() {
  var string = "string", fn = function() {};

	equals(true,  SC.empty(null),      "for null");
	equals(true,  SC.empty(undefined), "for undefined");
  equals(true,  SC.empty(""),        "for an empty String");
  equals(false, SC.empty(true),      "for true");
  equals(false, SC.empty(false),     "for false");
  equals(false, SC.empty(string),    "for a String");
  equals(false, SC.empty(fn),        "for a Function");
  equals(false, SC.empty(0),         "for 0");
  equals(false, SC.empty([]),        "for an empty Array");
  equals(false, SC.empty({}),        "for an empty Object");
});

test("SC.isArray" ,function(){
	var numarray      = [1,2,3],
	    number        = 23,
	    strarray      = ["Hello", "Hi"],
    	string        = "Hello",
	    object   	    = {},
      length        = {length: 12},
      fn            = function() {};

	equals( SC.isArray(numarray), true,  "[1,2,3]" );
	equals( SC.isArray(number),   false, "23" );
	equals( SC.isArray(strarray), true,  '["Hello", "Hi"]' );
	equals( SC.isArray(string),   false, '"Hello"' );
	equals( SC.isArray(object),   false, "{}" );
  equals( SC.isArray(length),   true,  "{length: 12}" );
  equals( SC.isArray(window),   false, "window" );
  equals( SC.isArray(fn),       false, "function() {}" );

  if (window.document) {
    var nodelist      = document.getElementsByTagName("body");
    equals( SC.isArray(nodelist), true, "NodeList" );
  }
});
