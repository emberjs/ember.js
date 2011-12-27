// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember.empty");

test("Ember.empty", function() {
  var string = "string", fn = function() {},
      object = {length: 0};

  equals(true,  Ember.empty(null),      "for null");
  equals(true,  Ember.empty(undefined), "for undefined");
  equals(true,  Ember.empty(""),        "for an empty String");
  equals(false, Ember.empty(true),      "for true");
  equals(false, Ember.empty(false),     "for false");
  equals(false, Ember.empty(string),    "for a String");
  equals(false, Ember.empty(fn),        "for a Function");
  equals(false, Ember.empty(0),         "for 0");
  equals(true,  Ember.empty([]),        "for an empty Array");
  equals(false, Ember.empty({}),        "for an empty Object");
  equals(true,  Ember.empty(object),     "for an Object that has zero 'length'");
});
