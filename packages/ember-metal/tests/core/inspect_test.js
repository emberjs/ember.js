import { inspect } from "ember-metal/utils";

QUnit.module("Ember.inspect");

QUnit.test("strings", function() {
  equal(inspect("foo"), "foo");
});

QUnit.test("numbers", function() {
  equal(inspect(2.6), "2.6");
});

QUnit.test("null", function() {
  equal(inspect(null), "null");
});

QUnit.test("undefined", function() {
  equal(inspect(undefined), "undefined");
});

QUnit.test("true", function() {
  equal(inspect(true), "true");
});

QUnit.test("false", function() {
  equal(inspect(false), "false");
});

QUnit.test("object", function() {
  equal(inspect({}), "{}");
  equal(inspect({ foo: 'bar' }), "{foo: bar}");
  equal(inspect({ foo() { return this; } }), "{foo: function() { ... }}");
});

QUnit.test("objects without a prototype", function() {
  var prototypelessObj = Object.create(null);
  equal(inspect({ foo: prototypelessObj }), "{foo: [object Object]}");
});

QUnit.test("array", function() {
  equal(inspect([1,2,3]), "[1,2,3]");
});

QUnit.test("regexp", function() {
  equal(inspect(/regexp/), "/regexp/");
});

QUnit.test("date", function() {
  var inspected = inspect(new Date("Sat Apr 30 2011 13:24:11"));
  ok(inspected.match(/Sat Apr 30/), "The inspected date has its date");
  ok(inspected.match(/2011/), "The inspected date has its year");
  ok(inspected.match(/13:24:11/), "The inspected date has its time");
});
