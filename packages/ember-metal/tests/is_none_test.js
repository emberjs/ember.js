import isNone from 'ember-metal/is_none';

QUnit.module("Ember.isNone");

QUnit.test("Ember.isNone", function() {
  var string = "string";
  var fn = function() {};

  equal(true, isNone(null), "for null");
  equal(true, isNone(undefined), "for undefined");
  equal(false, isNone(""), "for an empty String");
  equal(false, isNone(true), "for true");
  equal(false, isNone(false), "for false");
  equal(false, isNone(string), "for a String");
  equal(false, isNone(fn), "for a Function");
  equal(false, isNone(0), "for 0");
  equal(false, isNone([]), "for an empty Array");
  equal(false, isNone({}), "for an empty Object");
});
