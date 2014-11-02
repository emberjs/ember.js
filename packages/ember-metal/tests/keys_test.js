import { set } from "ember-metal/property_set";
import keys from "ember-metal/keys";
import {
  addObserver,
  removeObserver
} from "ember-metal/observer";

function K() { return this; }

QUnit.module("Fetch Keys ");

test("should get a key array for a specified object", function() {
  var object1 = {};

  object1.names = "Rahul";
  object1.age = "23";
  object1.place = "Mangalore";

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
  function Beer() { }
  Beer.prototype.type = 'ipa';

  var beer = new Beer();

  deepEqual(keys(beer), []);
});

test('should return properties that were set after object creation', function () {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  var beer = new Beer();

  set(beer, 'brand', 'big daddy');

  deepEqual(keys(beer), ['brand']);
});

QUnit.module('Keys behavior with observers');

test('should not leak properties on the prototype', function () {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  var beer = new Beer();

  addObserver(beer, 'type', K);
  deepEqual(keys(beer), []);
  removeObserver(beer, 'type', K);
});

test('observing a non existent property', function () {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  var beer = new Beer();

  addObserver(beer, 'brand', K);

  deepEqual(keys(beer), []);

  set(beer, 'brand', 'Corona');
  deepEqual(keys(beer), ['brand']);

  removeObserver(beer, 'brand', K);
});

test('with observers switched on and off', function () {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  var beer = new Beer();

  addObserver(beer, 'type', K);
  removeObserver(beer, 'type', K);

  deepEqual(keys(beer), []);
});

test('observers switched on and off with setter in between', function () {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  var beer = new Beer();

  addObserver(beer, 'type', K);
  set(beer, 'type', 'ale');
  removeObserver(beer, 'type', K);

  deepEqual(keys(beer), ['type']);
});

test('observer switched on and off and then setter', function () {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  var beer = new Beer();

  addObserver(beer, 'type', K);
  removeObserver(beer, 'type', K);
  set(beer, 'type', 'ale');

  deepEqual(keys(beer), ['type']);
});
