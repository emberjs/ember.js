module("Ember.isNone");

test("Ember.isNone", function() {
  var string = "string", fn = function() {};

  equal(true,  Ember.isNone(null),      "for null");
  equal(true,  Ember.isNone(undefined), "for undefined");
  equal(false, Ember.isNone(""),        "for an empty String");
  equal(false, Ember.isNone(true),      "for true");
  equal(false, Ember.isNone(false),     "for false");
  equal(false, Ember.isNone(string),    "for a String");
  equal(false, Ember.isNone(fn),        "for a Function");
  equal(false, Ember.isNone(0),         "for 0");
  equal(false, Ember.isNone([]),        "for an empty Array");
  equal(false, Ember.isNone({}),        "for an empty Object");
});
