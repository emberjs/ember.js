if (Ember.FEATURES.isEnabled('ember-metal-is-blank')) {
  module("Ember.isBlank");

  test("Ember.isBlank", function() {
    var string = "string", fn = function() {},
        object = {length: 0};

    equal(true,  Ember.isBlank(null),      "for null");
    equal(true,  Ember.isBlank(undefined), "for undefined");
    equal(true,  Ember.isBlank(""),        "for an empty String");
    equal(true,  Ember.isBlank("  "),      "for a whitespace String");
    equal(true,  Ember.isBlank("\n\t"),    "for another whitespace String");
    equal(false, Ember.isBlank("\n\t Hi"), "for a String with whitespaces");
    equal(false, Ember.isBlank(true),      "for true");
    equal(false, Ember.isBlank(false),     "for false");
    equal(false, Ember.isBlank(string),    "for a String");
    equal(false, Ember.isBlank(fn),        "for a Function");
    equal(false, Ember.isBlank(0),         "for 0");
    equal(true,  Ember.isBlank([]),        "for an empty Array");
    equal(false, Ember.isBlank({}),        "for an empty Object");
    equal(true,  Ember.isBlank(object),    "for an Object that has zero 'length'");
    equal(false, Ember.isBlank([1,2,3]),   "for a non-empty array");
  });
}
