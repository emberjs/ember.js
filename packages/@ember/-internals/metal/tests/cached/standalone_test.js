import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { cached, tracked } from '../..';

import { track, valueForTag, validateTag } from '@glimmer/validator';

moduleFor(
  'cached() - standalone usage',
  class extends AbstractTestCase {
    ['@test creates a memoized derived value'](assert) {
      let count = tracked(1);

      let computations = 0;
      let doubled = cached(() => {
        computations++;
        return count.value * 2;
      });

      assert.strictEqual(doubled.value, 2, 'value is readable via .value');
      assert.strictEqual(doubled.get(), 2, 'value is readable via .get()');
      assert.strictEqual(computations, 1, 'repeated reads do not recompute');

      count.value = 2;

      assert.strictEqual(doubled.value, 4, 'a changed input recomputes');
      assert.strictEqual(computations, 2);
    }

    ['@test reading entangles with the state the function reads'](assert) {
      let count = tracked(0);
      let doubled = cached(() => count.value * 2);

      let tag = track(() => doubled.value);
      let snapshot = valueForTag(tag);

      assert.true(validateTag(tag, snapshot), 'tag is valid before a change');

      count.value = 1;
      assert.false(validateTag(tag, snapshot), 'tag is invalidated by a change to an input');
    }

    ['@test equals option retains the previous value and its identity'](assert) {
      let letters = tracked(['b', 'a']);
      let sorted = cached(() => letters.value.slice().sort(), {
        equals: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
      });

      let first = sorted.value;
      assert.deepEqual(first, ['a', 'b']);

      letters.value = ['a', 'b'];
      assert.strictEqual(sorted.value, first, 'an equal recomputation retains the previous array');

      letters.value = ['c', 'a'];
      assert.notStrictEqual(sorted.value, first, 'an unequal recomputation is a new array');
      assert.deepEqual(sorted.value, ['a', 'c']);
    }

    ['@test errors when the second argument is not an options object']() {
      expectAssertion(() => {
        cached(() => 1, null);
      }, "cached() may only receive an options object containing 'equals' or 'description' as its second argument, received null");
    }

    ['@test errors when equals is not a function']() {
      expectAssertion(() => {
        cached(() => 1, { equals: true });
      }, "The 'equals' option passed to cached must be a function. Received true");
    }

    ['@test errors when description is not a string']() {
      expectAssertion(() => {
        cached(() => 1, { description: 123 });
      }, "The 'description' option passed to cached must be a string. Received 123");
    }
  }
);
