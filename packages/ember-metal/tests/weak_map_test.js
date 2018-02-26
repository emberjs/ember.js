import { WeakMapPolyfill as WeakMap } from '..';

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

QUnit.test('constructing a WeakMap with an invalid iterator throws an error', function(assert) {
  let expectedError = new TypeError('The weak map constructor polyfill only supports an array argument');

  assert.throws(() => { new WeakMap({ a: 1 }); }, expectedError);
});

QUnit.test('constructing a WeakMap with a valid iterator inserts the entries', function(assert) {
  let a = {};
  let b = {};
  let c = {};

  let map = new WeakMap([[a, 1], [b, 2], [c, 3]]);

  assert.strictEqual(map.get(a), 1);
  assert.strictEqual(map.get(b), 2);
  assert.strictEqual(map.get(c), 3);
});

QUnit.test('that error is thrown when using a primitive key', function(assert) {
  let expectedError = new TypeError('Invalid value used as weak map key');
  let map = new WeakMap();

  assert.throws(() => map.set('a', 1), expectedError);
  assert.throws(() => map.set(1, 1), expectedError);
  assert.throws(() => map.set(true, 1), expectedError);
  assert.throws(() => map.set(null, 1), expectedError);
  assert.throws(() => map.set(undefined, 1), expectedError);
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

QUnit.test('that .toString works as expected', function(assert) {
  let map = new WeakMap();

  assert.strictEqual(map.toString(), '[object WeakMap]');
});
