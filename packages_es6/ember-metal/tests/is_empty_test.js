import isEmpty from 'ember-metal/is_empty';

module("Ember.isEmpty");

test("Ember.isEmpty", function() {
  var string = "string", fn = function() {},
      object = {length: 0};

  equal(true,  isEmpty(null),      "for null");
  equal(true,  isEmpty(undefined), "for undefined");
  equal(true,  isEmpty(""),        "for an empty String");
  equal(false, isEmpty(true),      "for true");
  equal(false, isEmpty(false),     "for false");
  equal(false, isEmpty(string),    "for a String");
  equal(false, isEmpty(fn),        "for a Function");
  equal(false, isEmpty(0),         "for 0");
  equal(true,  isEmpty([]),        "for an empty Array");
  equal(false, isEmpty({}),        "for an empty Object");
  equal(true,  isEmpty(object),     "for an Object that has zero 'length'");
});
