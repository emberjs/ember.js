// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember Type Checking");

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
