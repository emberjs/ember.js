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

  equal(true,  Ember.empty(null),      "for null");
  equal(true,  Ember.empty(undefined), "for undefined");
  equal(true,  Ember.empty(""),        "for an empty String");
  equal(false, Ember.empty(true),      "for true");
  equal(false, Ember.empty(false),     "for false");
  equal(false, Ember.empty(string),    "for a String");
  equal(false, Ember.empty(fn),        "for a Function");
  equal(false, Ember.empty(0),         "for 0");
  equal(true,  Ember.empty([]),        "for an empty Array");
  equal(false, Ember.empty({}),        "for an empty Object");
  equal(true,  Ember.empty(object),     "for an Object that has zero 'length'");
});
