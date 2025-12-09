import { trackedWeakSet } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

import { module, test } from '../-utils';

expectTypeOf<ReturnType<typeof trackedWeakSet<object>>>().toMatchTypeOf<WeakSet<object>>();

module('@glimmer/validator: trackedWeakSet()', function () {
  test('constructor', (assert) => {
    const obj = {};
    const set = trackedWeakSet([obj]);

    assert.true(set.has(obj));
    assert.ok(set instanceof WeakSet);

    const array = [1, 2, 3];
    const iterable = [array];
    const fromIterable = trackedWeakSet(iterable);
    assert.true(fromIterable.has(array));
  });

  test('does not work with built-ins', (assert) => {
    const set = trackedWeakSet();

    // @ts-expect-error -- point is testing constructor error
    assert.throws(() => set.add('aoeu'), /Invalid value used in weak set/u);
    // @ts-expect-error -- point is testing constructor error
    assert.throws(() => set.add(true), /Invalid value used in weak set/u);
    // @ts-expect-error -- point is testing constructor error
    assert.throws(() => set.add(123), /Invalid value used in weak set/u);
    // @ts-expect-error -- point is testing constructor error
    assert.throws(() => set.add(undefined), /Invalid value used in weak set/u);
  });

  test('add/has', (assert) => {
    const obj = {};
    const set = trackedWeakSet();

    set.add(obj);
    assert.true(set.has(obj));
  });

  test('delete', (assert) => {
    const obj = {};
    const set = trackedWeakSet();

    assert.false(set.has(obj));

    set.add(obj);
    assert.true(set.has(obj));

    set.delete(obj);
    assert.false(set.has(obj));
  });
});
