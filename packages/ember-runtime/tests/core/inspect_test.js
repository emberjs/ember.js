module("Ember.inspect");

var inspect = Ember.inspect;

test("strings", function() {
  equal(inspect("foo"), "foo");
});

test("numbers", function() {
  equal(inspect(2.6), "2.6");
});

test("null", function() {
  equal(inspect(null), "null");
});

test("undefined", function() {
  equal(inspect(undefined), "undefined");
});

test("true", function() {
  equal(inspect(true), "true");
});

test("false", function() {
  equal(inspect(false), "false");
});

test("object", function() {
  equal(inspect({}), "{}");
  equal(inspect({ foo: 'bar' }), "{foo: bar}");
  equal(inspect({ foo: Ember.K }), "{foo: function() { ... }}");
});

test("array", function() {
  // this could be better, but let's not let this method get
  // out of control unless we want to go all the way, a la
  // JSDump
  equal(inspect([1,2,3]), "{0: 1, 1: 2, 2: 3}");
});
