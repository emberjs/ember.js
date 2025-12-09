import { trackedWeakMap } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

import { module, test } from '../-utils';

expectTypeOf<ReturnType<typeof trackedWeakMap<object, number>>>().toMatchTypeOf<
  WeakMap<object, number>
>();

module('@glimmer/validator: trackedWeakMap()', function () {
  test('constructor', (assert) => {
    const obj = {};
    const map = trackedWeakMap([[obj, 123]]);

    assert.strictEqual(map.get(obj), 123);
    assert.ok(map instanceof WeakMap);
  });

  test('does not work with built-ins', (assert) => {
    const map = trackedWeakMap();

    assert.throws(
      // @ts-expect-error -- point is testing constructor error
      () => map.set('aoeu', 123),
      /Invalid value used as weak map key/u
    );
    assert.throws(
      // @ts-expect-error -- point is testing constructor error
      () => map.set(true, 123),
      /Invalid value used as weak map key/u
    );
    assert.throws(
      // @ts-expect-error -- point is testing constructor error
      () => map.set(123, 123),
      /Invalid value used as weak map key/u
    );
    assert.throws(
      // @ts-expect-error -- point is testing constructor error
      () => map.set(undefined, 123),
      /Invalid value used as weak map key/u
    );
  });

  test('get/set', (assert) => {
    const obj = {};
    const map = trackedWeakMap();

    map.set(obj, 123);
    assert.strictEqual(map.get(obj), 123);

    map.set(obj, 456);
    assert.strictEqual(map.get(obj), 456);
  });

  test('has', (assert) => {
    const obj = {};
    const map = trackedWeakMap();

    assert.false(map.has(obj));
    map.set(obj, 123);
    assert.true(map.has(obj));
  });

  test('delete', (assert) => {
    const obj = {};
    const map = trackedWeakMap();

    assert.false(map.has(obj));

    map.set(obj, 123);
    assert.true(map.has(obj));

    map.delete(obj);
    assert.false(map.has(obj));
  });
});
