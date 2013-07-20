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
  equal(inspect([1,2,3]), "[1,2,3]");
});

test("regexp", function() {
  equal(inspect(/regexp/), "/regexp/");
});

test("date", function() {
  equal(inspect(new Date("Sat Apr 30 2011 13:24:11")).substring(0, 24), "Sat Apr 30 2011 13:24:11"); // Ignore assertion about timezone.
});

test("error", function() {
  equal(inspect(new Error("Oops")), "Error: Oops");
});
