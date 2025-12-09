import { trackedSet } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

import { module, test } from '../-utils';

expectTypeOf<ReturnType<typeof trackedSet<string>>>().toMatchTypeOf<Set<string>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

module('@glimmer/validator: trackedSet', function () {
  test('constructor', (assert) => {
    const set = trackedSet(['foo', 123]);

    assert.true(set.has('foo'));
    assert.strictEqual(set.size, 2);
    assert.ok(set instanceof Set);

    const setFromSet = trackedSet(set);
    assert.true(setFromSet.has('foo'));
    assert.strictEqual(setFromSet.size, 2);
    assert.ok(setFromSet instanceof Set);

    const setFromEmpty = trackedSet();
    assert.false(setFromEmpty.has('anything'));
    assert.strictEqual(setFromEmpty.size, 0);
    assert.ok(setFromEmpty instanceof Set);
  });

  test('works with all kinds of values', (assert) => {
    const set = trackedSet<string | Record<PropertyKey, unknown> | AnyFn | number | boolean | null>(
      [
        'foo',
        {},
        () => {
          /* no op */
        },
        123,
        true,
        null,
      ]
    );

    assert.strictEqual(set.size, 6);
  });

  test('add/has', (assert) => {
    const set = trackedSet();

    set.add('foo');
    assert.true(set.has('foo'));
  });

  test('entries', (assert) => {
    const set = trackedSet();
    set.add(0);
    set.add(2);
    set.add(1);

    const iter = set.entries();

    assert.deepEqual(iter.next().value, [0, 0]);
    assert.deepEqual(iter.next().value, [2, 2]);
    assert.deepEqual(iter.next().value, [1, 1]);
    assert.true(iter.next().done);
  });

  test('keys', (assert) => {
    const set = trackedSet();
    set.add(0);
    set.add(2);
    set.add(1);

    const iter = set.keys();

    assert.strictEqual(iter.next().value, 0);
    assert.strictEqual(iter.next().value, 2);
    assert.strictEqual(iter.next().value, 1);
    assert.true(iter.next().done);
  });

  test('values', (assert) => {
    const set = trackedSet();
    set.add(0);
    set.add(2);
    set.add(1);

    const iter = set.values();

    assert.strictEqual(iter.next().value, 0);
    assert.strictEqual(iter.next().value, 2);
    assert.strictEqual(iter.next().value, 1);
    assert.true(iter.next().done);
  });

  test('union', (assert) => {
    const set = trackedSet();
    const set2 = trackedSet();
    const nativeSet = new Set();

    set.add(0);
    set.add(2);
    set.add(1);

    set2.add(2);
    set2.add(3);

    nativeSet.add(0);
    nativeSet.add(5);

    let iter = set.union(set2).values();

    assert.strictEqual(iter.next().value, 0);
    assert.strictEqual(iter.next().value, 2);
    assert.strictEqual(iter.next().value, 1);
    assert.strictEqual(iter.next().value, 3);
    assert.true(iter.next().done);

    let iter2 = set.union(nativeSet).values();

    assert.strictEqual(iter2.next().value, 0);
    assert.strictEqual(iter2.next().value, 2);
    assert.strictEqual(iter2.next().value, 1);
    assert.strictEqual(iter2.next().value, 5);
    assert.true(iter2.next().done);
  });

  test('intersection', (assert) => {
    const set = trackedSet();
    const set2 = trackedSet();
    const nativeSet = new Set();

    set.add(0);
    set.add(2);
    set.add(1);

    set2.add(2);
    set2.add(3);

    nativeSet.add(0);
    nativeSet.add(5);

    let iter = set.intersection(set2).values();

    assert.strictEqual(iter.next().value, 2);
    assert.true(iter.next().done);

    let iter2 = set.intersection(nativeSet).values();

    assert.strictEqual(iter2.next().value, 0);
    assert.true(iter2.next().done);
  });

  test('difference', (assert) => {
    const set = trackedSet();
    const set2 = trackedSet();
    const nativeSet = new Set();

    set.add(0);
    set.add(2);
    set.add(1);

    set2.add(2);
    set2.add(3);

    nativeSet.add(0);
    nativeSet.add(5);

    let iter = set.difference(set2).values();

    assert.strictEqual(iter.next().value, 0);
    assert.strictEqual(iter.next().value, 1);
    assert.true(iter.next().done);

    let iter2 = set.difference(nativeSet).values();

    assert.strictEqual(iter2.next().value, 2);
    assert.strictEqual(iter2.next().value, 1);
    assert.true(iter2.next().done);
  });

  test('symmetricDifference', (assert) => {
    const set = trackedSet();
    const set2 = trackedSet();
    const nativeSet = new Set();

    set.add(0);
    set.add(2);
    set.add(1);

    set2.add(2);
    set2.add(3);

    nativeSet.add(0);
    nativeSet.add(5);

    let iter = set.symmetricDifference(set2).values();

    assert.strictEqual(iter.next().value, 0);
    assert.strictEqual(iter.next().value, 1);
    assert.strictEqual(iter.next().value, 3);
    assert.true(iter.next().done);

    let iter2 = set.symmetricDifference(nativeSet).values();

    assert.strictEqual(iter2.next().value, 2);
    assert.strictEqual(iter2.next().value, 1);
    assert.strictEqual(iter2.next().value, 5);
    assert.true(iter2.next().done);
  });

  test('isSubsetOf', (assert) => {
    const set = trackedSet();
    const set2 = trackedSet();
    const nativeSet = new Set();

    set.add(0);
    set.add(2);
    set.add(1);

    set2.add(2);
    set2.add(3);

    nativeSet.add(0);
    nativeSet.add(5);

    assert.false(set.isSubsetOf(set2));

    set2.add(0);
    set2.add(1);

    assert.true(set.isSubsetOf(set2));

    assert.false(set.isSubsetOf(nativeSet));

    nativeSet.add(1);
    nativeSet.add(2);

    assert.true(set.isSubsetOf(nativeSet));
  });

  test('isSupersetOf', (assert) => {
    const set = trackedSet();
    const set2 = trackedSet();
    const nativeSet = new Set();

    set.add(0);
    set.add(2);
    set.add(1);

    set2.add(2);
    set2.add(3);

    nativeSet.add(0);
    nativeSet.add(5);

    assert.false(set.isSupersetOf(set2));

    set.add(3);

    assert.true(set.isSupersetOf(set2));

    assert.false(set.isSupersetOf(nativeSet));

    set.add(5);

    assert.true(set.isSupersetOf(nativeSet));
  });

  test('isDisjointFrom', (assert) => {
    const set = trackedSet();
    const set2 = trackedSet();
    const nativeSet = new Set();

    set.add(0);
    set.add(2);
    set.add(1);

    set2.add(3);

    nativeSet.add(5);

    assert.true(set.isDisjointFrom(set2));

    set2.add(2);

    assert.false(set.isDisjointFrom(set2));

    assert.true(set.isDisjointFrom(nativeSet));

    nativeSet.add(0);

    assert.false(set.isDisjointFrom(nativeSet));
  });

  test('forEach', (assert) => {
    const set = trackedSet();
    set.add(0);
    set.add(1);
    set.add(2);

    let count = 0;
    let values = '';

    set.forEach((v, k) => {
      count++;
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      values += k;
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      values += v;
    });

    assert.strictEqual(count, 3);
    assert.strictEqual(values, '001122');
  });

  test('size', (assert) => {
    const set = trackedSet();
    assert.strictEqual(set.size, 0);

    set.add(0);
    assert.strictEqual(set.size, 1);

    set.add(1);
    assert.strictEqual(set.size, 2);

    set.delete(1);
    assert.strictEqual(set.size, 1);

    set.add(0);
    assert.strictEqual(set.size, 1);
  });

  test('delete', (assert) => {
    const set = trackedSet();

    assert.false(set.has(0));

    set.add(0);
    assert.true(set.has(0));

    set.delete(0);
    assert.false(set.has(0));
  });

  test('clear', (assert) => {
    const set = trackedSet();

    set.add(0);
    set.add(1);
    assert.strictEqual(set.size, 2);

    set.clear();
    assert.strictEqual(set.size, 0);
    assert.false(set.has(0));
    assert.false(set.has(1));
  });
});
