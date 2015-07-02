import isSome from 'ember-metal/is_some';

QUnit.module("Ember.isSome");

QUnit.test("Ember.isSome", function() {
  var string = "string";
  var fn = function() {};

  equal(false, isSome(null), "for null");
  equal(false, isSome(undefined), "for undefined");
  equal(true,  isSome(""), "for an empty String");
  equal(true,  isSome(true), "for true");
  equal(true,  isSome(false), "for false");
  equal(true,  isSome(string), "for a String");
  equal(true,  isSome(fn), "for a Function");
  equal(true,  isSome(0), "for 0");
  equal(true,  isSome([]), "for an empty Array");
  equal(true,  isSome({}), "for an empty Object");
});

