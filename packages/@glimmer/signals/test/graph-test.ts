import {
  beginFrame,
  consumeFrame,
  consumeTag,
  createCache,
  createFrame,
  createTag,
  dirtyTag,
  disposeFrame,
  endFrame,
  getValue,
  isFrameStale,
  isTagFresh,
  releaseTag,
  type TagNode,
  track,
  trackInto,
  updateTag,
  watchTag,
} from '@glimmer/signals';

import { module, test } from './-utils';

function run(frame: TagNode, block: () => void) {
  beginFrame(frame);

  try {
    block();
  } finally {
    endFrame();
  }
}

function hasSubscribers(tag: TagNode) {
  return tag.subs !== undefined;
}

module('@glimmer/signals: graph', () => {
  module('frames', () => {
    test('a write to a tag makes the frame stale', (assert) => {
      let tag = createTag();
      let frame = createFrame();

      run(frame, () => consumeTag(tag));

      assert.false(isFrameStale(frame));

      dirtyTag(tag);

      assert.true(isFrameStale(frame));

      run(frame, () => consumeTag(tag));

      assert.false(isFrameStale(frame));
    });

    test('a frame without reads is never stale', (assert) => {
      let tag = createTag();
      let frame = createFrame();

      run(frame, () => {});
      dirtyTag(tag);

      assert.false(isFrameStale(frame));
    });

    test('a write below a child frame makes the parent frame stale', (assert) => {
      let tag = createTag();
      let parent = createFrame();
      let child = createFrame();

      run(parent, () => {
        run(child, () => consumeTag(tag));
        consumeFrame(child);
      });

      dirtyTag(tag);

      assert.true(isFrameStale(child));
      assert.true(isFrameStale(parent));
    });

    test('a parent that does not use a child frame again removes its links', (assert) => {
      let tag = createTag();
      let parent = createFrame();
      let child = createFrame();

      run(parent, () => {
        run(child, () => consumeTag(tag));
        consumeFrame(child);
      });

      assert.true(hasSubscribers(tag));

      run(parent, () => {});

      assert.false(hasSubscribers(tag));
    });

    test('a frame drops a dependency that the next run does not read', (assert) => {
      let first = createTag();
      let second = createTag();
      let frame = createFrame();
      let useFirst = true;

      let block = () => consumeTag(useFirst ? first : second);

      run(frame, block);
      useFirst = false;
      run(frame, block);

      dirtyTag(first);
      assert.false(isFrameStale(frame));
      assert.false(hasSubscribers(first));

      dirtyTag(second);
      assert.true(isFrameStale(frame));
    });

    test('a write to a tag that the open run read does not make the frame stale', (assert) => {
      let tag = createTag();
      let frame = createFrame();

      run(frame, () => {
        consumeTag(tag);
        dirtyTag(tag, true);
      });

      assert.false(isFrameStale(frame));

      dirtyTag(tag);

      assert.true(isFrameStale(frame));
    });

    test('a later write is visible when a write in the run made a cache stale', (assert) => {
      let tag = createTag();
      let cache = createCache(() => consumeTag(tag));
      let frame = createFrame();

      run(frame, () => {
        getValue(cache);
        dirtyTag(tag, true);
      });

      assert.false(isFrameStale(frame));

      dirtyTag(tag);

      assert.true(isFrameStale(frame));
    });

    test('disposeFrame removes the links of all that the frame read', (assert) => {
      let tag = createTag();
      let cache = createCache(() => consumeTag(tag));
      let root = createFrame();
      let child = createFrame();

      run(root, () => {
        run(child, () => getValue(cache));
        consumeFrame(child);
      });

      assert.true(hasSubscribers(tag));

      disposeFrame(root);

      assert.false(hasSubscribers(tag));
    });
  });

  module('caches', () => {
    test('a cache keeps its value until a write', (assert) => {
      let tag = createTag();
      let count = 0;
      let cache = createCache(() => {
        consumeTag(tag);
        return ++count;
      });

      assert.strictEqual(getValue(cache), 1);
      assert.strictEqual(getValue(cache), 1);

      dirtyTag(tag);

      assert.strictEqual(getValue(cache), 2);
    });

    test('a cache that loses its last subscriber removes its links', (assert) => {
      let tag = createTag();
      let count = 0;
      let cache = createCache(() => {
        consumeTag(tag);
        return ++count;
      });
      let frame = createFrame();

      run(frame, () => assert.strictEqual(getValue(cache), 1));

      assert.true(hasSubscribers(tag));

      disposeFrame(frame);

      assert.false(hasSubscribers(tag));
      assert.strictEqual(getValue(cache), 2, 'the cache runs again, because it had no links');
    });

    test('a frame is stale after a write below a nested cache', (assert) => {
      let tag = createTag();
      let inner = createCache(() => consumeTag(tag));
      let outer = createCache(() => getValue(inner));
      let frame = createFrame();

      run(frame, () => getValue(outer));
      dirtyTag(tag);

      assert.true(isFrameStale(frame));
    });

    test('a tag from track() that holds a cache sees each write', (assert) => {
      let first = createTag();
      let second = createTag();
      let cache = createCache(() => {
        consumeTag(first);
        consumeTag(second);
      });

      let tag = track(() => getValue(cache));
      let frame = createFrame();

      watchTag(frame, tag);
      dirtyTag(first);
      assert.true(isFrameStale(frame));

      watchTag(frame, tag);
      assert.false(isFrameStale(frame));

      dirtyTag(second);
      assert.true(isFrameStale(frame), 'the stale cache does not hide the second write');
    });
  });

  module('updateTag', () => {
    test('the tag changes for each write to the source', (assert) => {
      let tag = createTag();
      let source = createTag();

      updateTag(tag, source);

      let frame = createFrame();
      watchTag(frame, tag);
      dirtyTag(source);
      assert.true(isFrameStale(frame));

      watchTag(frame, tag);
      dirtyTag(source);
      assert.true(isFrameStale(frame));
    });

    test('the tag changes for each write below a cache in the source', (assert) => {
      let tag = createTag();
      let leaf = createTag();
      let cache = createCache(() => consumeTag(leaf));

      updateTag(
        tag,
        track(() => getValue(cache))
      );

      let frame = createFrame();
      watchTag(frame, tag);
      dirtyTag(leaf);
      assert.true(isFrameStale(frame));

      watchTag(frame, tag);
      dirtyTag(leaf);
      assert.true(isFrameStale(frame), 'the stale cache does not hide the second write');
    });

    test('a frame that read the tag is stale after a write to the source', (assert) => {
      let tag = createTag();
      let source = createTag();
      let frame = createFrame();

      updateTag(tag, source);
      run(frame, () => consumeTag(tag));

      dirtyTag(source);

      assert.true(isFrameStale(frame));
    });

    test('a chain of tags forwards a write', (assert) => {
      let first = createTag();
      let second = createTag();
      let third = createTag();

      updateTag(first, second);
      updateTag(second, third);

      let frame = createFrame();
      watchTag(frame, first);
      dirtyTag(third);

      assert.true(isFrameStale(frame));
    });

    test('a new source replaces the old source', (assert) => {
      let tag = createTag();
      let oldSource = createTag();
      let newSource = createTag();

      updateTag(tag, oldSource);
      updateTag(tag, newSource);

      let frame = createFrame();
      watchTag(frame, tag);

      dirtyTag(oldSource);
      assert.false(isFrameStale(frame));
      assert.false(hasSubscribers(oldSource));

      dirtyTag(newSource);
      assert.true(isFrameStale(frame));
    });

    test('a subscriber that links to a stale tag follows the next source only', (assert) => {
      let tag = createTag();
      let first = createTag();
      let second = createTag();
      let frame = createFrame();

      trackInto(tag, () => consumeTag(first));
      watchTag(frame, tag);

      dirtyTag(first);
      assert.true(isFrameStale(frame));
      assert.false(isTagFresh(tag));

      watchTag(frame, tag);
      trackInto(tag, () => consumeTag(second));

      assert.true(isTagFresh(tag));

      dirtyTag(first);
      assert.false(isFrameStale(frame), 'the old source has no link');

      dirtyTag(second);
      assert.true(isFrameStale(frame));
    });

    test('a subscriber sees a second write when the tag stays stale', (assert) => {
      let tag = createTag();
      let source = createTag();
      let frame = createFrame();

      updateTag(tag, source);
      watchTag(frame, tag);

      dirtyTag(source);
      assert.true(isFrameStale(frame));

      watchTag(frame, tag);
      assert.false(isFrameStale(frame));

      dirtyTag(source);
      assert.true(isFrameStale(frame));
    });

    test('releaseTag removes the links from the source', (assert) => {
      let tag = createTag();
      let source = createTag();

      updateTag(tag, source);
      assert.true(hasSubscribers(source));

      releaseTag(tag);
      assert.false(hasSubscribers(source));
    });
  });
});
