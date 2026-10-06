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
  '@tracked decorator - options',
  class extends AbstractTestCase {
    ['@test equals option prevents dirtying when values are equal'](assert) {
      class Tracked {
        @tracked({ equals: (a, b) => a === b }) value = 0;
      }

      let obj = new Tracked();

      let tag = track(() => obj.value);
      let snapshot = watch(tag);

      assert.strictEqual(obj.value, 0, 'initializer ran');

      obj.value = 0;
      assert.true(isValid(snapshot), 'setting an equal value does not invalidate');

      obj.value = 1;
      assert.false(isValid(snapshot), 'setting a new value invalidates');
      assert.strictEqual(obj.value, 1);
    }

    ['@test without an equals option, self-assignment dirties'](assert) {
      class Tracked {
        @tracked value = 0;
      }

      let obj = new Tracked();

      let tag = track(() => obj.value);
      let snapshot = watch(tag);

      let current = obj.value;
      obj.value = current;
      assert.false(isValid(snapshot), 'a no-op set invalidates');
    }

    ['@test equals option is compared against the initial value before any read'](assert) {
      let compared = [];

      class Tracked {
        @tracked({
          equals: (a, b) => {
            compared.push([a, b]);
            return a === b;
          },
        })
        value = 0;
      }

      let obj = new Tracked();

      obj.value = 1;

      assert.deepEqual(compared, [[0, 1]], 'the initial value was used for comparison');
      assert.strictEqual(obj.value, 1);
    }

    ['@test errors when equals is not a function']() {
      expectAssertion(() => {
        tracked({ equals: true });
      }, "The 'equals' option passed to tracked must be a function. Received true");
    }

    ['@test errors when description is not a string']() {
      expectAssertion(() => {
        tracked({ description: 123 });
      }, "The 'description' option passed to tracked must be a string. Received 123");
    }
  }
);
