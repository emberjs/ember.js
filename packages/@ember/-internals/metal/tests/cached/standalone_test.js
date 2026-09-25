import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { cached, tracked } from '../..';

import { track, valueForTag, validateTag } from '@glimmer/validator';

moduleFor(
  'cached() - standalone usage',
  class extends AbstractTestCase {
    ['@test creates a cached computation'](assert) {
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

    ['@test errors when the second argument is not an options object']() {
      expectAssertion(() => {
        cached(() => 1, null);
      }, "cached() may only receive an options object containing 'description' as its second argument, received null");
    }

    ['@test errors when description is not a string']() {
      expectAssertion(() => {
        cached(() => 1, { description: 123 });
      }, "The 'description' option passed to cached must be a string. Received 123");
    }
  }
);
