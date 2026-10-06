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
  releaseTag,
  type TagNode,
  track,
  updateTag,
  validateTag,
  valueForTag,
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
    test('a cache without a subscriber has no links from its tags', (assert) => {
      let tag = createTag();
      let count = 0;
      let cache = createCache(() => {
        consumeTag(tag);
        return ++count;
      });

      assert.strictEqual(getValue(cache), 1);
      assert.strictEqual(getValue(cache), 1);
      assert.false(hasSubscribers(tag));

      dirtyTag(tag);

      assert.strictEqual(getValue(cache), 2);
      assert.false(hasSubscribers(tag));
    });

    test('a cache keeps its value when it gets a subscriber and when it loses it', (assert) => {
      let tag = createTag();
      let count = 0;
      let cache = createCache(() => {
        consumeTag(tag);
        return ++count;
      });
      let frame = createFrame();

      assert.strictEqual(getValue(cache), 1);

      run(frame, () => assert.strictEqual(getValue(cache), 1));

      assert.true(hasSubscribers(tag));

      disposeFrame(frame);

      assert.false(hasSubscribers(tag));
      assert.strictEqual(getValue(cache), 1);

      dirtyTag(tag);

      assert.strictEqual(getValue(cache), 2);
    });

    test('a nested cache gets its links back together with the outer cache', (assert) => {
      let tag = createTag();
      let innerCount = 0;
      let inner = createCache(() => {
        consumeTag(tag);
        return ++innerCount;
      });
      let outer = createCache(() => getValue(inner));
      let frame = createFrame();

      assert.strictEqual(getValue(outer), 1);
      assert.false(hasSubscribers(tag));

      run(frame, () => getValue(outer));

      assert.true(hasSubscribers(tag));
      assert.strictEqual(innerCount, 1);

      dirtyTag(tag);

      assert.true(isFrameStale(frame));
      assert.strictEqual(getValue(outer), 2);
    });

    test('a cache that lost its subscriber while stale runs again', (assert) => {
      let tag = createTag();
      let count = 0;
      let cache = createCache(() => {
        consumeTag(tag);
        return ++count;
      });
      let frame = createFrame();

      run(frame, () => getValue(cache));
      dirtyTag(tag);
      disposeFrame(frame);

      assert.strictEqual(getValue(cache), 2);
    });

    test('a tag from track() that holds a cache sees each write', (assert) => {
      let first = createTag();
      let second = createTag();
      let cache = createCache(() => {
        consumeTag(first);
        consumeTag(second);
      });

      let tag = track(() => getValue(cache));
      let snapshot = valueForTag(tag);

      dirtyTag(first);
      assert.false(validateTag(tag, snapshot));

      snapshot = valueForTag(tag);
      assert.true(validateTag(tag, snapshot));

      dirtyTag(second);
      assert.false(validateTag(tag, snapshot));
    });
  });

  module('updateTag', () => {
    test('the tag changes for each write to the source', (assert) => {
      let tag = createTag();
      let source = createTag();

      updateTag(tag, source);

      let snapshot = valueForTag(tag);
      dirtyTag(source);
      assert.false(validateTag(tag, snapshot));

      snapshot = valueForTag(tag);
      dirtyTag(source);
      assert.false(validateTag(tag, snapshot));
    });

    test('the tag changes for each write below a cache in the source', (assert) => {
      let tag = createTag();
      let leaf = createTag();
      let cache = createCache(() => consumeTag(leaf));

      updateTag(
        tag,
        track(() => getValue(cache))
      );

      let snapshot = valueForTag(tag);
      dirtyTag(leaf);
      assert.false(validateTag(tag, snapshot));

      snapshot = valueForTag(tag);
      dirtyTag(leaf);
      assert.false(validateTag(tag, snapshot), 'the stale cache does not hide the second write');
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

      let snapshot = valueForTag(first);
      dirtyTag(third);

      assert.false(validateTag(first, snapshot));
    });

    test('a new source replaces the old source', (assert) => {
      let tag = createTag();
      let oldSource = createTag();
      let newSource = createTag();

      updateTag(tag, oldSource);
      updateTag(tag, newSource);

      let snapshot = valueForTag(tag);

      dirtyTag(oldSource);
      assert.true(validateTag(tag, snapshot));
      assert.false(hasSubscribers(oldSource));

      dirtyTag(newSource);
      assert.false(validateTag(tag, snapshot));
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
