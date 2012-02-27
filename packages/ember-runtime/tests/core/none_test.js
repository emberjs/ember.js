// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember.none");

test("Ember.none", function() {
  var string = "string", fn = function() {};

  equal(true,  Ember.none(null),      "for null");
  equal(true,  Ember.none(undefined), "for undefined");
  equal(false, Ember.none(""),        "for an empty String");
  equal(false, Ember.none(true),      "for true");
  equal(false, Ember.none(false),     "for false");
  equal(false, Ember.none(string),    "for a String");
  equal(false, Ember.none(fn),        "for a Function");
  equal(false, Ember.none(0),         "for 0");
  equal(false, Ember.none([]),        "for an empty Array");
  equal(false, Ember.none({}),        "for an empty Object");
});
