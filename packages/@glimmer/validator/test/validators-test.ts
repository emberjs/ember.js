import { testOverrideGlobalContext } from '@glimmer/global-context';
import type { UpdatableTag } from '@glimmer/interfaces';

import {
  ALLOW_CYCLES,
  bump,
  combine,
  CONSTANT_TAG,
  createTag,
  createUpdatableTag,
  CURRENT_TAG,
  dirtyTag,
  updateTag,
  validateTag,
  valueForTag,
  VOLATILE_TAG,
} from '@glimmer/validator';
import { module, test } from './-utils';

function unwrap<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('unexpected null or undefined value');
  }

  return value;
}

module('@glimmer/validator: validators', () => {
  module('DirtyableTag', () => {
    test('it can be dirtied', (assert) => {
      let tag = createTag();
      let snapshot = valueForTag(tag);

      assert.ok(validateTag(tag, snapshot));

      dirtyTag(tag);
      assert.notOk(validateTag(tag, snapshot));

      snapshot = valueForTag(tag);
      assert.ok(validateTag(tag, snapshot));
    });

    test('it calls scheduleRevalidate', (assert) => {
      let originalContext = unwrap(testOverrideGlobalContext)({
        scheduleRevalidate() {
          assert.step('scheduleRevalidate');
          assert.ok(true, 'called');
        },
      });

      try {
        let tag = createTag();

        dirtyTag(tag);
      } finally {
        unwrap(testOverrideGlobalContext)(originalContext);
      }

      assert.verifySteps(['scheduleRevalidate']);
    });

    if (import.meta.env.DEV) {
      test('it cannot be updated', (assert) => {
        let tag = createTag();
        let subtag = createTag();

        assert.throws(
          () => updateTag(tag as unknown as UpdatableTag, subtag),
          /Error: Attempted to update a tag that was not updatable/u
        );
      });
    }
  });

  module('UpdatableTag', () => {
    test('it can be dirtied', (assert) => {
      let tag = createUpdatableTag();
      let snapshot = valueForTag(tag);

      assert.ok(validateTag(tag, snapshot));

      dirtyTag(tag);
      assert.notOk(validateTag(tag, snapshot));

      snapshot = valueForTag(tag);
      assert.ok(validateTag(tag, snapshot));
    });

    test('it can be updated', (assert) => {
      let tag = createUpdatableTag();
      let subtag = createUpdatableTag();

      updateTag(tag, subtag);

      let snapshot = valueForTag(tag);
      assert.ok(validateTag(tag, snapshot));

      dirtyTag(subtag);
      assert.notOk(validateTag(tag, snapshot));

      snapshot = valueForTag(tag);
      assert.ok(validateTag(tag, snapshot));
    });

    test('it correctly buffers updates when subtag has a less recent value', (assert) => {
      let tag = createUpdatableTag();
      let subtag = createUpdatableTag();

      // First, we dirty the parent tag so it is more recent than the subtag
      dirtyTag(tag);

      // Then, we get a snapshot of the parent
      let snapshot = valueForTag(tag);

      // Now, we update the parent tag with the subtag, and revalidate it
      updateTag(tag as unknown as UpdatableTag, subtag);

      assert.ok(validateTag(tag, snapshot), 'tag is still valid after being updated');

      // Finally, dirty the subtag one final time to bust the buffer cache
      dirtyTag(subtag);

      assert.notOk(validateTag(tag, snapshot), 'tag is invalid after subtag is dirtied again');
    });

    test('it correctly buffers updates when subtag has a more recent value', (assert) => {
      let tag = createUpdatableTag();
      let subtag = createUpdatableTag();

      // First, we get a snapshot of the parent
      let snapshot = valueForTag(tag);

      // Then we dirty the currently unrelated subtag
      dirtyTag(subtag);

      // Now, we update the parent tag with the subtag, and revalidate it
      updateTag(tag, subtag);

      assert.ok(validateTag(tag, snapshot), 'tag is still valid after being updated');

      // Finally, dirty the subtag one final time to bust the buffer cache
      dirtyTag(subtag);

      assert.notOk(validateTag(tag, snapshot), 'tag is invalid after subtag is dirtied again');
    });

    if (import.meta.env.DEV) {
      test('does not allow cycles on tags that have not been marked with ALLOW_CYCLES', (assert) => {
        let tag = createUpdatableTag();
        let subtag = createUpdatableTag();

        let snapshot = valueForTag(tag);

        updateTag(tag, subtag);
        updateTag(subtag, tag);

        dirtyTag(tag);

        assert.throws(() => validateTag(tag, snapshot));
      });

      test('does allow cycles on tags that have been marked with ALLOW_CYCLES', (assert) => {
        let tag = createUpdatableTag();
        let subtag = createUpdatableTag();

        let snapshot = valueForTag(tag);

        unwrap(ALLOW_CYCLES).set(tag, true);
        unwrap(ALLOW_CYCLES).set(subtag, true);

        updateTag(tag, subtag);
        updateTag(subtag, tag);

        dirtyTag(tag);

        assert.notOk(validateTag(tag, snapshot));
      });
    }
  });

  module('CombinatorTag', () => {
    test('it can combine multiple tags', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = combine([tag1, tag2]);

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.notOk(validateTag(combined, snapshot));
    });

    if (import.meta.env.DEV) {
      test('it cannot be dirtied', (assert) => {
        let tag1 = createTag();
        let tag2 = createTag();

        let combined = combine([tag1, tag2]);

        assert.throws(
          // @ts-expect-error this is an error condition
          () => dirtyTag(combined),
          /Error: Attempted to dirty a tag that was not dirtyable/u
        );
      });

      test('it cannot be updated', (assert) => {
        let tag1 = createTag();
        let tag2 = createTag();

        let combined = combine([tag1, tag2]);

        assert.throws(
          // @ts-expect-error this is an error condition
          () => updateTag(combined, tag1),
          /Error: Attempted to update a tag that was not updatable/u
        );
      });
    }
  });

  module('ConstantTag', () => {
    if (import.meta.env.DEV) {
      test('it cannot be dirtied', (assert) => {
        assert.throws(
          // @ts-expect-error this is an error condition
          () => dirtyTag(CONSTANT_TAG),
          /Error: Attempted to dirty a tag that was not dirtyable/u
        );
      });

      test('it cannot be updated', (assert) => {
        let subtag = createTag();

        assert.throws(
          // @ts-expect-error this is an error condition
          () => updateTag(CONSTANT_TAG, subtag),
          /Error: Attempted to update a tag that was not updatable/u
        );
      });
    }
  });

  module('VolatileTag', () => {
    test('it is always invalid', (assert) => {
      let snapshot = valueForTag(VOLATILE_TAG);
      assert.notOk(validateTag(VOLATILE_TAG, snapshot));
    });

    test('it ensures that any tags which it is combined with are also always invalid', (assert) => {
      let tag2 = createTag();

      let combined = combine([VOLATILE_TAG, tag2]);

      bump();

      let snapshot = valueForTag(combined);
      assert.notOk(validateTag(combined, snapshot));
    });

    if (import.meta.env.DEV) {
      test('it cannot be dirtied', (assert) => {
        assert.throws(
          // @ts-expect-error this is an error condition
          () => dirtyTag(VOLATILE_TAG),
          /Error: Attempted to dirty a tag that was not dirtyable/u
        );
      });

      test('it cannot be updated', (assert) => {
        let subtag = createTag();

        assert.throws(
          // @ts-expect-error this is an error condition
          () => updateTag(VOLATILE_TAG, subtag),
          /Error: Attempted to update a tag that was not updatable/u
        );
      });
    }
  });

  module('CurrentTag', () => {
    test('it is always the current revision', (assert) => {
      let snapshot = valueForTag(CURRENT_TAG);
      assert.ok(validateTag(CURRENT_TAG, snapshot));

      let tag = createTag();
      dirtyTag(tag);

      assert.notOk(validateTag(CURRENT_TAG, snapshot));
    });

    test('it ensures that any tags which it is combined with are also always the current revision', (assert) => {
      let tag2 = createTag();
      let combined = combine([CURRENT_TAG, tag2]);

      let snapshot = valueForTag(combined);
      assert.ok(validateTag(combined, snapshot));

      let otherTag = createTag();
      dirtyTag(otherTag);

      assert.notOk(validateTag(combined, snapshot));
    });

    if (import.meta.env.DEV) {
      test('it cannot be dirtied', (assert) => {
        assert.throws(
          // @ts-expect-error this is an error condition
          () => dirtyTag(CURRENT_TAG),
          /Error: Attempted to dirty a tag that was not dirtyable/u
        );
      });

      test('it cannot be updated', (assert) => {
        let subtag = createTag();

        assert.throws(
          // @ts-expect-error this is an error condition
          () => updateTag(CURRENT_TAG, subtag),
          /Error: Attempted to update a tag that was not updatable/u
        );
      });
    }
  });
});
