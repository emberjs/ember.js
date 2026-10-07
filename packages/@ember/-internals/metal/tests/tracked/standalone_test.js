import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { tracked } from '../..';

import { createFrame, isFrameStale, track, watchTag } from '@glimmer/signals';

function watch(tag) {
  let frame = createFrame();
  watchTag(frame, tag);
  return frame;
}

function isValid(frame) {
  return !isFrameStale(frame);
}

moduleFor(
  'tracked() - standalone usage',
  class extends AbstractTestCase {
    ['@test creates a reactive value'](assert) {
      let count = tracked(0);

      assert.strictEqual(count.value, 0, 'initial value is readable via .value');
      assert.strictEqual(count.get(), 0, 'initial value is readable via .get()');

      count.value = 1;
      assert.strictEqual(count.value, 1, 'value can be assigned');

      count.set(2);
      assert.strictEqual(count.value, 2, 'value can be set via .set()');

      count.update((value) => value + 1);
      assert.strictEqual(count.value, 3, 'value can be updated via .update()');
    }

    ['@test reading consumes and writing dirties'](assert) {
      let count = tracked(0);

      let tag = track(() => count.value);
      let snapshot = watch(tag);

      assert.true(isValid(snapshot), 'tag is valid before a change');

      count.value = 1;
      assert.false(isValid(snapshot), 'tag is invalidated by a change');
    }

    ['@test default equality is Object.is'](assert) {
      let count = tracked(0);

      let tag = track(() => count.value);
      let snapshot = watch(tag);

      count.value = 0;
      assert.true(isValid(snapshot), 'setting an equal value does not invalidate');

      count.value = 1;
      assert.false(isValid(snapshot), 'setting a new value invalidates');
    }

    ['@test equality can be customized'](assert) {
      let state = tracked({ id: 1 }, { equals: (a, b) => a.id === b.id });

      let tag = track(() => state.value);
      let snapshot = watch(tag);

      state.value = { id: 1 };
      assert.true(isValid(snapshot), 'setting an equal value does not invalidate');

      state.value = { id: 2 };
      assert.false(isValid(snapshot), 'setting a different value invalidates');
    }

    ['@test always-dirty equality'](assert) {
      let count = tracked(0, { equals: () => false });

      let tag = track(() => count.value);
      let snapshot = watch(tag);

      count.value = 0;
      assert.false(isValid(snapshot), 'a no-op set invalidates');
    }

    ['@test freeze() prevents further updates'](assert) {
      let count = tracked(0);

      count.freeze();

      assert.throws(() => count.set(1), /frozen/);
      assert.strictEqual(count.value, 0);
    }

    ['@test works with null and undefined initial values'](assert) {
      let a = tracked(null);
      let b = tracked(undefined);

      assert.strictEqual(a.value, null);
      assert.strictEqual(b.value, undefined);

      a.value = 1;
      b.value = 2;

      assert.strictEqual(a.value, 1);
      assert.strictEqual(b.value, 2);
    }

    ['@test wraps arbitrary objects'](assert) {
      let initial = { foo: 1 };
      let state = tracked(initial);

      assert.strictEqual(state.value, initial, 'the object itself is the value');
    }
  }
);
