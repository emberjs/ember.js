import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import {
  computed,
  defineProperty,
  get,
  notifyPropertyChange,
  tagForProperty,
  tracked,
} from '../..';

import { track, valueForTag, validateTag } from '@glimmer/validator';

/*
  A class with a tracked accessor `count`, with the decorator applied by hand.

  The legacy decorator build of the tests cannot compile the `accessor`
  keyword, so this does what a stage 3 transform emits.
*/
function classWithTrackedAccessor(decorator, initial) {
  let decorated;

  class Example {
    #count = decorated.init ? decorated.init.call(this, initial) : initial;

    get count() {
      return decorated.get.call(this);
    }

    set count(value) {
      decorated.set.call(this, value);
    }

    static storage = {
      get() {
        return this.#count;
      },
      set(value) {
        this.#count = value;
      },
    };

    toString() {
      return 'Example';
    }
  }

  decorated = decorator(Example.storage, {
    kind: 'accessor',
    name: 'count',
    static: false,
    private: false,
    addInitializer() {},
    metadata: {},
  });

  return Example;
}

moduleFor(
  '@tracked accessor',
  class extends AbstractTestCase {
    ['@test a read gives the initial value and a write invalidates'](assert) {
      let Example = classWithTrackedAccessor(tracked, 0);
      let obj = new Example();

      let tag = track(() => obj.count);
      let snapshot = valueForTag(tag);

      assert.strictEqual(obj.count, 0);
      assert.true(validateTag(tag, snapshot));

      obj.count = 1;

      assert.false(validateTag(tag, snapshot));
      assert.strictEqual(obj.count, 1);
    }

    ['@test a write before the first read keeps the value'](assert) {
      let Example = classWithTrackedAccessor(tracked, 0);
      let obj = new Example();

      obj.count = 5;

      assert.strictEqual(obj.count, 5);
    }

    ['@test instances do not share a value or a tag'](assert) {
      let Example = classWithTrackedAccessor(tracked, 0);
      let first = new Example();
      let second = new Example();

      let tag = track(() => second.count);
      let snapshot = valueForTag(tag);

      first.count = 1;

      assert.true(validateTag(tag, snapshot));
      assert.strictEqual(second.count, 0);
    }

    ['@test a write dirties the tag that tagForProperty gave before the first read or write'](
      assert
    ) {
      let Example = classWithTrackedAccessor(tracked, 0);
      let obj = new Example();

      let tag = tagForProperty(obj, 'count');
      let snapshot = valueForTag(tag);

      obj.count = 1;

      assert.false(validateTag(tag, snapshot));
    }

    ['@test notifyPropertyChange dirties the tag that a read consumed'](assert) {
      let Example = classWithTrackedAccessor(tracked, 0);
      let obj = new Example();

      let tag = track(() => obj.count);
      let snapshot = valueForTag(tag);

      notifyPropertyChange(obj, 'count');

      assert.false(validateTag(tag, snapshot));
    }

    ['@test a computed property with the accessor as a dependent key updates'](assert) {
      let Example = classWithTrackedAccessor(tracked, 1);

      defineProperty(
        Example.prototype,
        'double',
        computed('count', function () {
          return this.count * 2;
        })
      );

      let obj = new Example();

      assert.strictEqual(get(obj, 'double'), 2);

      obj.count = 2;

      assert.strictEqual(get(obj, 'double'), 4);
    }

    ['@test self-assignment invalidates without an equals option'](assert) {
      let Example = classWithTrackedAccessor(tracked, 0);
      let obj = new Example();

      let tag = track(() => obj.count);
      let snapshot = valueForTag(tag);

      obj.count = 0;

      assert.false(validateTag(tag, snapshot));
    }

    ['@test the equals option skips a write of an equal value'](assert) {
      let Example = classWithTrackedAccessor(tracked({ equals: (a, b) => a === b }), 0);
      let obj = new Example();

      let tag = track(() => obj.count);
      let snapshot = valueForTag(tag);

      obj.count = 0;

      assert.true(validateTag(tag, snapshot));

      obj.count = 1;

      assert.false(validateTag(tag, snapshot));
      assert.strictEqual(obj.count, 1);
    }

    ['@test a read of an array value consumes the tag of the array'](assert) {
      let Example = classWithTrackedAccessor(tracked, []);
      let obj = new Example();

      let tag = track(() => obj.count);
      let snapshot = valueForTag(tag);

      notifyPropertyChange(obj.count, '[]');

      assert.false(validateTag(tag, snapshot));
    }

    ['@test a write after a read in the same computation names the object and the key']() {
      let Example = classWithTrackedAccessor(tracked, 0);
      let obj = new Example();

      expectAssertion(() => {
        track(() => {
          obj.count;
          obj.count = 1;
        });
      }, /You attempted to update `count` on `Example`, but it had already been used previously in the same computation/);
    }
  }
);
