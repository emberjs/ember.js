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

test('should not contain properties declared in the prototype', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  var keys = Ember.keys(beer);

  deepEqual(keys, []);
});

test('should return properties that were set after object creation', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.set(beer, 'brand', 'big daddy');

  var keys = Ember.keys(beer);

  deepEqual(keys, ['brand']);
});

module('Keys behavior with observers');

test('should not leak properties on the prototype', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  deepEqual(Ember.keys(beer), []);
  Ember.removeObserver(beer, 'type', Ember.K);
});

test('observing a non existent property', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'brand', Ember.K);

  deepEqual(Ember.keys(beer), []);

  Ember.set(beer, 'brand', 'Corona');
  deepEqual(Ember.keys(beer), ['brand']);

  Ember.removeObserver(beer, 'brand', Ember.K);
});

test('with observers switched on and off', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  Ember.removeObserver(beer, 'type', Ember.K);

  deepEqual(Ember.keys(beer), []);
});

test('observers switched on and off with setter in between', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  Ember.set(beer, 'type', 'ale');
  Ember.removeObserver(beer, 'type', Ember.K);

  deepEqual(Ember.keys(beer), ['type']);
});

test('observer switched on and off and then setter', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  Ember.removeObserver(beer, 'type', Ember.K);
  Ember.set(beer, 'type', 'ale');

  deepEqual(Ember.keys(beer), ['type']);
});
