import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { tracked } from '../..';

import { track, valueForTag, validateTag } from '@glimmer/validator';

moduleFor(
  '@tracked decorator - options',
  class extends AbstractTestCase {
    ['@test equals option prevents dirtying when values are equal'](assert) {
      class Tracked {
        @tracked({ equals: (a, b) => a === b }) value = 0;
      }

      let obj = new Tracked();

      let tag = track(() => obj.value);
      let snapshot = valueForTag(tag);

      assert.strictEqual(obj.value, 0, 'initializer ran');

      obj.value = 0;
      assert.true(validateTag(tag, snapshot), 'setting an equal value does not invalidate');

      obj.value = 1;
      assert.false(validateTag(tag, snapshot), 'setting a new value invalidates');
      assert.strictEqual(obj.value, 1);
    }

    ['@test without an equals option, self-assignment dirties'](assert) {
      class Tracked {
        @tracked value = 0;
      }

      let obj = new Tracked();

      let tag = track(() => obj.value);
      let snapshot = valueForTag(tag);

      let current = obj.value;
      obj.value = current;
      assert.false(validateTag(tag, snapshot), 'a no-op set invalidates');
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

      obj.value = 0;

      assert.deepEqual(compared, [[0, 0]], 'the initial value was used for comparison');
      assert.strictEqual(obj.value, 0);
    }

    ['@test description option is accepted'](assert) {
      class Tracked {
        @tracked({ description: 'my value' }) value = 0;
      }

      let obj = new Tracked();

      obj.value = 1;
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
