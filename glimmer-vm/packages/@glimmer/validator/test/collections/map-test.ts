import { trackedMap } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

import { module, test } from '../-utils';

expectTypeOf<ReturnType<typeof trackedMap<string, number>>>().toMatchTypeOf<Map<string, number>>();

module('@glimmer/validator: trackedMap', function () {
  test('constructor', (assert) => {
    const map = trackedMap([['foo', 123]]);

    assert.strictEqual(map.get('foo'), 123);
    assert.strictEqual(map.size, 1);
    assert.ok(map instanceof Map);

    const map2 = trackedMap(map);
    assert.strictEqual(map2.get('foo'), 123);
    assert.strictEqual(map2.size, 1);
    assert.ok(map2 instanceof Map);
  });

  test('works with all kinds of keys', (assert) => {
    // Spoiler: they are needed, as without them, types are inferred
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
    const map = trackedMap<unknown, unknown>([
      ['foo', 123],
      [{}, {}],
      [
        () => {
          /* no op! */
        },
        'bar',
      ],
      [123, true],
      [true, false],
      [null, null],
    ]);

    assert.strictEqual(map.size, 6);
  });

  test('get/set', (assert) => {
    const map = trackedMap();

    map.set('foo', 123);
    assert.strictEqual(map.get('foo'), 123);

    map.set('foo', 456);
    assert.strictEqual(map.get('foo'), 456);
  });

  test('has', (assert) => {
    const map = trackedMap();

    assert.false(map.has('foo'));
    map.set('foo', 123);
    assert.true(map.has('foo'));
  });

  test('entries', (assert) => {
    const map = trackedMap();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    const iter = map.entries();

    assert.deepEqual(iter.next().value, [0, 1]);
    assert.deepEqual(iter.next().value, [1, 2]);
    assert.deepEqual(iter.next().value, [2, 3]);
    assert.true(iter.next().done);
  });

  test('keys', (assert) => {
    const map = trackedMap();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    const iter = map.keys();

    assert.strictEqual(iter.next().value, 0);
    assert.strictEqual(iter.next().value, 1);
    assert.strictEqual(iter.next().value, 2);
    assert.true(iter.next().done);
  });

  test('values', (assert) => {
    const map = trackedMap();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    const iter = map.values();

    assert.strictEqual(iter.next().value, 1);
    assert.strictEqual(iter.next().value, 2);
    assert.strictEqual(iter.next().value, 3);
    assert.true(iter.next().done);
  });

  test('forEach', (assert) => {
    const map = trackedMap<number, number>();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    let count = 0;
    let values = '';

    map.forEach((v, k) => {
      count++;
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      values += k;
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      values += v;
    });

    assert.strictEqual(count, 3);
    assert.strictEqual(values, '011223');
  });

  test('size', (assert) => {
    const map = trackedMap();
    assert.strictEqual(map.size, 0);

    map.set(0, 1);
    assert.strictEqual(map.size, 1);

    map.set(1, 2);
    assert.strictEqual(map.size, 2);

    map.delete(1);
    assert.strictEqual(map.size, 1);

    map.set(0, 3);
    assert.strictEqual(map.size, 1);
  });

  test('delete', (assert) => {
    const map = trackedMap();

    assert.false(map.has(0));

    map.set(0, 123);
    assert.true(map.has(0));

    map.delete(0);
    assert.false(map.has(0));
  });

  test('clear', (assert) => {
    const map = trackedMap();

    map.set(0, 1);
    map.set(1, 2);
    assert.strictEqual(map.size, 2);

    map.clear();
    assert.strictEqual(map.size, 0);
    assert.strictEqual(map.get(0), undefined);
    assert.strictEqual(map.get(1), undefined);
  });
});
