import { cachedValue, track, trackedValue, validateTag, valueForTag } from '@glimmer/validator';

import { module, test } from './-utils';

module('@glimmer/validator: cachedValue()', () => {
  test('creates a memoized derived value', (assert) => {
    const count = trackedValue(1);

    let computations = 0;
    const doubled = cachedValue(() => {
      computations++;
      return count.value * 2;
    });

    assert.strictEqual(doubled.value, 2);
    assert.strictEqual(doubled.get(), 2);
    assert.strictEqual(computations, 1, 'repeated reads do not recompute');

    count.value = 2;

    assert.strictEqual(doubled.value, 4);
    assert.strictEqual(computations, 2, 'a changed input recomputes');

    assert.strictEqual(doubled.value, 4);
    assert.strictEqual(computations, 2, 'repeated reads still do not recompute');
  });

  test('reading entangles with the state the function reads', (assert) => {
    const count = trackedValue(0);
    const doubled = cachedValue(() => count.value * 2);

    const tag = track(() => doubled.value);
    const snapshot = valueForTag(tag);

    assert.true(validateTag(tag, snapshot), 'tag is valid before a change');

    count.value = 1;
    assert.false(validateTag(tag, snapshot), 'tag is invalidated by a change to an input');
  });

  test('options.equals retains the previous value and its identity', (assert) => {
    const letters = trackedValue(['b', 'a']);
    const sorted = cachedValue(() => letters.value.slice().sort(), {
      equals: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
    });

    const first = sorted.value;
    assert.deepEqual(first, ['a', 'b']);

    letters.value = ['a', 'b'];
    assert.strictEqual(sorted.value, first, 'an equal recomputation retains the previous array');

    letters.value = ['c', 'a'];
    assert.notStrictEqual(sorted.value, first, 'an unequal recomputation produces a new array');
    assert.deepEqual(sorted.value, ['a', 'c']);
  });

  test('default equals is Object.is (new identities count as new values)', (assert) => {
    const input = trackedValue(0);
    const wrapped = cachedValue(() => ({ input: input.value }));

    const first = wrapped.value;

    input.value = 1;
    assert.notStrictEqual(wrapped.value, first, 'a recomputed object is a new value');
  });

  test('get can be detached from the instance', (assert) => {
    const count = trackedValue(1);
    const doubled = cachedValue(() => count.value * 2);
    const { get } = doubled;

    assert.strictEqual(get(), 2);

    count.value = 2;
    assert.strictEqual(get(), 4);
  });
});
