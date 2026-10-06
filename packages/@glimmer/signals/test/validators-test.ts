import { DEBUG } from '@glimmer/env';
import { testOverrideGlobalContext } from '@glimmer/global-context';
import type { Tag, TagNode } from '@glimmer/signals';
import {
  CONSTANT_TAG,
  createFrame,
  createTag,
  writeCount,
  dirtyTag,
  isFrameStale,
  updateTag,
  watchTag,
} from '@glimmer/signals';

import { module, test } from './-utils';

/**
 * A subscriber for `tag`. `isValid` answers `false` after a write to the tag.
 */
function watch(tag: Tag) {
  let frame = createFrame();
  watchTag(frame, tag);
  return frame;
}

function isValid(frame: TagNode) {
  return !isFrameStale(frame);
}

function unwrap<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('unexpected null or undefined value');
  }

  return value;
}

module('@glimmer/signals: validators', () => {
  module('DirtyableTag', () => {
    test('it can be dirtied', (assert) => {
      let tag = createTag();
      let snapshot = watch(tag);

      assert.ok(isValid(snapshot));

      dirtyTag(tag);
      assert.notOk(isValid(snapshot));

      snapshot = watch(tag);
      assert.ok(isValid(snapshot));
    });

    if (DEBUG) {
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
    }
  });

  module('UpdatableTag', () => {
    test('it can be dirtied', (assert) => {
      let tag = createTag();
      let snapshot = watch(tag);

      assert.ok(isValid(snapshot));

      dirtyTag(tag);
      assert.notOk(isValid(snapshot));

      snapshot = watch(tag);
      assert.ok(isValid(snapshot));
    });

    test('it can be updated', (assert) => {
      let tag = createTag();
      let subtag = createTag();

      updateTag(tag, subtag);

      let snapshot = watch(tag);
      assert.ok(isValid(snapshot));

      dirtyTag(subtag);
      assert.notOk(isValid(snapshot));

      snapshot = watch(tag);
      assert.ok(isValid(snapshot));
    });

    test('it correctly buffers updates when subtag has a less recent value', (assert) => {
      let tag = createTag();
      let subtag = createTag();

      // First, we dirty the parent tag so it is more recent than the subtag
      dirtyTag(tag);

      // Then, we get a snapshot of the parent
      let snapshot = watch(tag);

      // Now, we update the parent tag with the subtag, and revalidate it
      updateTag(tag, subtag);

      assert.ok(isValid(snapshot), 'tag is still valid after being updated');

      // Finally, dirty the subtag one final time to bust the buffer cache
      dirtyTag(subtag);

      assert.notOk(isValid(snapshot), 'tag is invalid after subtag is dirtied again');
    });

    test('it correctly buffers updates when subtag has a more recent value', (assert) => {
      let tag = createTag();
      let subtag = createTag();

      // First, we get a snapshot of the parent
      let snapshot = watch(tag);

      // Then we dirty the currently unrelated subtag
      dirtyTag(subtag);

      // Now, we update the parent tag with the subtag, and revalidate it
      updateTag(tag, subtag);

      assert.ok(isValid(snapshot), 'tag is still valid after being updated');

      // Finally, dirty the subtag one final time to bust the buffer cache
      dirtyTag(subtag);

      assert.notOk(isValid(snapshot), 'tag is invalid after subtag is dirtied again');
    });

    test('two tags can follow each other', (assert) => {
      let tag = createTag();
      let subtag = createTag();

      let snapshot = watch(tag);
      let subtagSnapshot = watch(subtag);

      updateTag(tag, subtag);
      updateTag(subtag, tag);

      dirtyTag(tag);

      assert.notOk(isValid(snapshot));
      assert.notOk(isValid(subtagSnapshot));
    });
  });

  module('CombinatorTag', () => {
    test('it can combine multiple tags', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = [tag1, tag2];

      let snapshot = watch(combined);
      dirtyTag(tag1);
      assert.notOk(isValid(snapshot));

      snapshot = watch(combined);
      dirtyTag(tag2);
      assert.notOk(isValid(snapshot));
    });

    if (DEBUG) {
      test('it cannot be dirtied', (assert) => {
        let tag1 = createTag();
        let tag2 = createTag();

        let combined = [tag1, tag2];

        assert.throws(
          () => dirtyTag(combined),
          /Error: Attempted to dirty a tag that was not dirtyable/u
        );
      });

      test('it cannot be updated', (assert) => {
        let tag1 = createTag();
        let tag2 = createTag();

        let combined = [tag1, tag2];

        assert.throws(
          () => updateTag(combined, tag1),
          /Error: Attempted to update a tag that was not updatable/u
        );
      });
    }
  });

  module('ConstantTag', () => {
    if (DEBUG) {
      test('it cannot be dirtied', (assert) => {
        assert.throws(
          () => dirtyTag(CONSTANT_TAG),
          /Error: Attempted to dirty a tag that was not dirtyable/u
        );
      });

      test('it cannot be updated', (assert) => {
        let subtag = createTag();

        assert.throws(
          () => updateTag(CONSTANT_TAG, subtag),
          /Error: Attempted to update a tag that was not updatable/u
        );
      });
    }
  });

  module('writeCount', () => {
    test('it changes when a tag is dirtied', (assert) => {
      let snapshot = writeCount();

      let tag = createTag();
      dirtyTag(tag);

      assert.notStrictEqual(writeCount(), snapshot);
    });
  });
});
