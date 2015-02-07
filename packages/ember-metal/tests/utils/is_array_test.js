import { isArray } from 'ember-metal/utils';
QUnit.module("Ember Type Checking");

var global = this;

QUnit.test("Ember.isArray", function() {
  var numarray      = [1,2,3];
  var number        = 23;
  var strarray      = ["Hello", "Hi"];
  var string        = "Hello";
  var object        = {};
  var length        = { length: 12 };
  var fn            = function() {};

  equal(isArray(numarray), true, "[1,2,3]");
  equal(isArray(number), false, "23");
  equal(isArray(strarray), true, '["Hello", "Hi"]');
  equal(isArray(string), false, '"Hello"');
  equal(isArray(object), false, "{}");
  equal(isArray(length), true, "{ length: 12 }");
  equal(isArray(global), false, "global");
  equal(isArray(fn), false, "function() {}");
});
