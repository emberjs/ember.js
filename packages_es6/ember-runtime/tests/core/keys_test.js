import {set} from "ember-metal/property_set";
import keys from "ember-runtime/keys";
import {addObserver, removeObserver} from "ember-metal/observer";
import EmberObject from "ember-runtime/system/object";

module("Fetch Keys ");

test("should get a key array for a specified object", function() {
  var object1 = {};

  object1.names = "Rahul";
  object1.age = "23";
  object1.place = "Mangalore";

  var object2 = keys(object1);

  deepEqual(object2, ['names','age','place']);
});

test("should get a key array for a specified Ember.Object", function() {
  var object1 = EmberObject.create({
    names: "Rahul",
    age: "23",
    place: "Mangalore"
  });

  var object2 = keys(object1);

  deepEqual(object2, ['names','age','place']);
});

// This test is for IE8.
test("should get a key array for property that is named the same as prototype property", function() {
  var object1 = {
    toString: function() {}
  };

  var object2 = keys(object1);

  deepEqual(object2, ['toString']);
});

test('should not contain properties declared in the prototype', function () {
  var beer = EmberObject.extend({
    type: 'ipa'
  }).create();

  deepEqual(keys(beer), []);
});

test('should return properties that were set after object creation', function () {
  var beer = EmberObject.extend({
    type: 'ipa'
  }).create();

  set(beer, 'brand', 'big daddy');

  deepEqual(keys(beer), ['brand']);
});

module('Keys behavior with observers');

test('should not leak properties on the prototype', function () {
  var beer = EmberObject.extend({
    type: 'ipa'
  }).create();

  addObserver(beer, 'type', Ember.K);
  deepEqual(keys(beer), []);
  removeObserver(beer, 'type', Ember.K);
});

test('observing a non existent property', function () {
  var beer = EmberObject.extend({
    type: 'ipa'
  }).create();

  addObserver(beer, 'brand', Ember.K);

  deepEqual(keys(beer), []);

  set(beer, 'brand', 'Corona');
  deepEqual(keys(beer), ['brand']);

  removeObserver(beer, 'brand', Ember.K);
});

test('with observers switched on and off', function () {
  var beer = EmberObject.extend({
    type: 'ipa'
  }).create();

  addObserver(beer, 'type', Ember.K);
  removeObserver(beer, 'type', Ember.K);

  deepEqual(keys(beer), []);
});

test('observers switched on and off with setter in between', function () {
  var beer = EmberObject.extend({
    type: 'ipa'
  }).create();

  addObserver(beer, 'type', Ember.K);
  set(beer, 'type', 'ale');
  removeObserver(beer, 'type', Ember.K);

  deepEqual(keys(beer), ['type']);
});

test('observer switched on and off and then setter', function () {
  var beer = EmberObject.extend({
    type: 'ipa'
  }).create();

  addObserver(beer, 'type', Ember.K);
  removeObserver(beer, 'type', Ember.K);
  set(beer, 'type', 'ale');

  deepEqual(keys(beer), ['type']);
});
