// ==========================================================================
// Project:   Ember Runtime
// Copyright: ©2012 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var obj;

module("Ember.canInvoke", {
  setup: function() {
    obj = {
      foobar: "foobar",
      aMethodThatExists: function() {}
    };
  },

  teardown: function() {
    obj = undefined;
  }
});

test("should return false if the object doesn't exist", function() {
  equal(Ember.canInvoke(undefined, 'aMethodThatDoesNotExist'), false);
});

test("should return true if the method exists on the object", function() {
  equal(Ember.canInvoke(obj, 'aMethodThatExists'), true);
});

test("should return false if the method doesn't exist on the object", function() {
  equal(Ember.canInvoke(obj, 'aMethodThatDoesNotExist'), false);
});

test("should return false if the property exists on the object but is a non-function", function() {
  equal(Ember.canInvoke(obj, 'foobar'), false);
});
