module("Ember.A");

test("returns an array if passed an array", function() {
  deepEqual([1,2,3], Ember.A([1,2,3]));
});

test("asserts if called with non-array argument", function() {
  expectAssertion(function() {
    Ember.A(1);
  }, 'Em.A only excepts an array argument');

  expectAssertion(function() {
    Ember.A('a');
  }, 'Em.A only excepts an array argument');

  expectAssertion(function() {
    Ember.A({});
  }, 'Em.A only excepts an array argument');

  expectAssertion(function() {
    Ember.A(null);
  }, 'Em.A only excepts an array argument');

  expectAssertion(function() {
    Ember.A(undefined);
  }, 'Em.A only excepts an array argument');
});

test("returns an empty array if called with no paramaters or []", function() {
  deepEqual([], Ember.A());
  deepEqual([], Ember.A([]));
});
