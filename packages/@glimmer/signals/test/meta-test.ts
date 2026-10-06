import type { Tag, TagNode } from '@glimmer/signals';
import { createFrame, dirtyTagFor, isFrameStale, tagFor, watchTag } from '@glimmer/signals';

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

module('@glimmer/signals: meta', () => {
  test('it creates a unique tag for a property on a given object', (assert) => {
    let obj = {};
    let tag = tagFor(obj, 'foo');
    assert.strictEqual(tagFor(obj, 'foo'), tag);
  });

  test('it can dirty the tag for a property on a given object', (assert) => {
    let obj = {};
    let tag = tagFor(obj, 'foo');

    let snapshot = watch(tag);
    dirtyTagFor(obj, 'foo');

    assert.notOk(isValid(snapshot));
  });
});
