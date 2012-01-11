// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember.none");

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
