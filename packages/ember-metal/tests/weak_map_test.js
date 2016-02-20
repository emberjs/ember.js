import WeakMap from 'ember-metal/weak_map';

QUnit.module('Ember.WeakMap');

QUnit.test('has weakMap like qualities', function(assert) {
  let map = new WeakMap();
  let map2 = new WeakMap();

  let a = {};
  let b = {};
  let c = {};

  assert.strictEqual(map.get(a), undefined);
  assert.strictEqual(map.get(b), undefined);
  assert.strictEqual(map.get(c), undefined);

  assert.strictEqual(map2.get(a), undefined);
  assert.strictEqual(map2.get(b), undefined);
  assert.strictEqual(map2.get(c), undefined);

  assert.strictEqual(map.set(a,  1), map, 'map.set should return itself');
  assert.strictEqual(map.get(a), 1);
  assert.strictEqual(map.set(b,  undefined), map);
  assert.strictEqual(map.set(a, 2), map);
  assert.strictEqual(map.get(a), 2);
  assert.strictEqual(map.set(b,  undefined), map);

  assert.strictEqual(map2.get(a), undefined);
  assert.strictEqual(map2.get(b), undefined);
  assert.strictEqual(map2.get(c), undefined);

  assert.strictEqual(map.set(c, 1), map);
  assert.strictEqual(map.get(c), 1);
  assert.strictEqual(map.get(a), 2);
  assert.strictEqual(map.get(b), undefined);

  assert.strictEqual(map2.set(a, 3), map2);
  assert.strictEqual(map2.set(b, 4), map2);
  assert.strictEqual(map2.set(c, 5), map2);

  assert.strictEqual(map2.get(a), 3);
  assert.strictEqual(map2.get(b), 4);
  assert.strictEqual(map2.get(c), 5);

  assert.strictEqual(map.get(c), 1);
  assert.strictEqual(map.get(a), 2);
  assert.strictEqual(map.get(b), undefined);
});

QUnit.test('invoking the WeakMap constructor with arguments is not supported at this time', function(assert) {
  expectAssertion(function() {
    new WeakMap([[{}, 1]]);
  }, /Invoking the WeakMap constructor with arguments is not supported at this time/);
});

QUnit.test('that error is thrown when using a primitive key', function(assert) {
  let map = new WeakMap();

  expectAssertion(function() {
    map.set('a', 1);
  }, /Uncaught TypeError: Invalid value used as weak map key/);

  expectAssertion(function() {
    map.set(1, 1);
  }, /Uncaught TypeError: Invalid value used as weak map key/);

  expectAssertion(function() {
    map.set(true, 1);
  }, /Uncaught TypeError: Invalid value used as weak map key/);

  expectAssertion(function() {
    map.set(null, 1);
  }, /Uncaught TypeError: Invalid value used as weak map key/);

  expectAssertion(function() {
    map.set(undefined, 1);
  }, /Uncaught TypeError: Invalid value used as weak map key/);
});

QUnit.test('that .has and .delete work as expected', function(assert) {
  let map = new WeakMap();
  let a = {};
  let b = {};
  let foo = { id: 1, name: 'My file', progress: 0 };

  assert.strictEqual(map.set(a, foo), map);
  assert.strictEqual(map.get(a), foo);
  assert.strictEqual(map.has(a), true);
  assert.strictEqual(map.has(b), false);
  assert.strictEqual(map.delete(a), true);
  assert.strictEqual(map.has(a), false);
  assert.strictEqual(map.delete(a), false);
  assert.strictEqual(map.set(a, undefined), map);
  assert.strictEqual(map.has(a), true);
  assert.strictEqual(map.delete(a), true);
  assert.strictEqual(map.delete(a), false);
  assert.strictEqual(map.has(a), false);
});
