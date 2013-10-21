// ========================================================================
// Ember.keys Tests
// ========================================================================
/*globals module test */

module("Fetch Keys ");

test("should get a key array for a specified object", function() {
  var object1 = {};

  object1.names = "Rahul";
  object1.age = "23";
  object1.place = "Mangalore";

  var object2 = Ember.keys(object1);

  deepEqual(object2, ['names','age','place']);
});

test("should get a key array for a specified Ember.Object", function() {
  var object1 = Ember.Object.create({
    names: "Rahul",
    age: "23",
    place: "Mangalore"
  });

  var object2 = Ember.keys(object1);

  deepEqual(object2, ['names','age','place']);
});

// This test is for IE8.
test("should get a key array for property that is named the same as prototype property", function() {
  var object1 = {
    toString: function() {}
  };

  var object2 = Ember.keys(object1);

  deepEqual(object2, ['toString']);
});
