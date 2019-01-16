import { DEBUG } from '@glimmer/env';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { meta, counters } from '..';

moduleFor(
  'Ember.meta listeners',
  class extends AbstractTestCase {
    ['@test basics'](assert) {
      let t = {};
      let m = meta({});
      m.addToListeners('hello', t, 'm', 0);
      let matching = m.matchingListeners('hello');
      assert.equal(matching.length, 3);
      assert.equal(matching[0], t);
      m.removeFromListeners('hello', t, 'm');
      matching = m.matchingListeners('hello');
      assert.equal(matching, undefined);
    }

    ['@test inheritance'](assert) {
      let target = {};
      let parent = {};
      let parentMeta = meta(parent);
      parentMeta.addToListeners('hello', target, 'm', 0);

      let child = Object.create(parent);
      let m = meta(child);

      let matching = m.matchingListeners('hello');
      assert.equal(matching.length, 3);
      assert.equal(matching[0], target);
      assert.equal(matching[1], 'm');
      assert.equal(matching[2], 0);
      m.removeFromListeners('hello', target, 'm');
      matching = m.matchingListeners('hello');
      assert.equal(matching, undefined);
      matching = parentMeta.matchingListeners('hello');
      assert.equal(matching.length, 3);
    }

    ['@test deduplication'](assert) {
      let t = {};
      let m = meta({});
      m.addToListeners('hello', t, 'm', 0);
      m.addToListeners('hello', t, 'm', 0);
      let matching = m.matchingListeners('hello');
      assert.equal(matching.length, 3);
      assert.equal(matching[0], t);
    }

    ['@test parent caching'](assert) {
      if (DEBUG) {
        counters.flattenedListenersCalls = 0;
        counters.parentListenersUsed = 0;
      }

      class Class {}
      let classMeta = meta(Class.prototype);
      classMeta.addToListeners('hello', null, 'm', 0);

      let instance = new Class();
      let m = meta(instance);

      let matching = m.matchingListeners('hello');

      assert.equal(matching.length, 3);
      if (DEBUG) {
        assert.equal(counters.flattenedListenersCalls, 2);
        assert.equal(counters.parentListenersUsed, 1);
      }
      matching = m.matchingListeners('hello');

      assert.equal(matching.length, 3);
      if (DEBUG) {
        assert.equal(counters.flattenedListenersCalls, 3);
        assert.equal(counters.parentListenersUsed, 1);
      }
    }

    ['@test parent cache invalidation'](assert) {
      if (DEBUG) {
        counters.flattenedListenersCalls = 0;
        counters.parentListenersUsed = 0;
        counters.listenersInherited = 0;
      }

      class Class {}
      let classMeta = meta(Class.prototype);
      classMeta.addToListeners('hello', null, 'm', 0);

      let instance = new Class();
      let m = meta(instance);

      let matching = m.matchingListeners('hello');

      assert.equal(matching.length, 3);
      if (DEBUG) {
        assert.equal(counters.flattenedListenersCalls, 2);
        assert.equal(counters.parentListenersUsed, 1);
        assert.equal(counters.listenersInherited, 0);
      }

      m.addToListeners('hello', null, 'm2');

      matching = m.matchingListeners('hello');

      assert.equal(matching.length, 6);
      if (DEBUG) {
        assert.equal(counters.flattenedListenersCalls, 4);
        assert.equal(counters.parentListenersUsed, 1);
        assert.equal(counters.listenersInherited, 1);
      }
    }

    ['@test reopen after flatten'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      // Ensure counter is zeroed
      counters.reopensAfterFlatten = 0;

      class Class1 {}
      let class1Meta = meta(Class1.prototype);
      class1Meta.addToListeners('hello', null, 'm', 0);

      let instance1 = new Class1();
      let m1 = meta(instance1);

      class Class2 {}
      let class2Meta = meta(Class2.prototype);
      class2Meta.addToListeners('hello', null, 'm', 0);

      let instance2 = new Class2();
      let m2 = meta(instance2);

      m1.matchingListeners('hello');
      m2.matchingListeners('hello');

      assert.equal(counters.reopensAfterFlatten, 0, 'no reopen calls yet');

      m1.addToListeners('world', null, 'm', 0);
      m2.addToListeners('world', null, 'm', 0);
      m1.matchingListeners('world');
      m2.matchingListeners('world');

      assert.equal(counters.reopensAfterFlatten, 1, 'reopen calls after invalidating parent cache');

      m1.addToListeners('world', null, 'm', 0);
      m2.addToListeners('world', null, 'm', 0);
      m1.matchingListeners('world');
      m2.matchingListeners('world');

      assert.equal(counters.reopensAfterFlatten, 1, 'no reopen calls after mutating leaf nodes');

      class1Meta.removeFromListeners('hello', null, 'm');
      class2Meta.removeFromListeners('hello', null, 'm');
      m1.matchingListeners('hello');
      m2.matchingListeners('hello');

      assert.equal(counters.reopensAfterFlatten, 2, 'one reopen call after mutating parents');

      class1Meta.addToListeners('hello', null, 'm', 0);
      m1.matchingListeners('hello');
      class2Meta.addToListeners('hello', null, 'm', 0);
      m2.matchingListeners('hello');

      assert.equal(
        counters.reopensAfterFlatten,
        3,
        'one reopen call after mutating parents and flattening out of order'
      );
    }

    ['@test REMOVE_ALL does not interfere with future adds'](assert) {
      expectDeprecation(() => {
        let t = {};
        let m = meta({});

        m.addToListeners('hello', t, 'm', 0);
        let matching = m.matchingListeners('hello');

        assert.equal(matching.length, 3);
        assert.equal(matching[0], t);

        // Remove all listeners
        m.removeAllListeners('hello');

        matching = m.matchingListeners('hello');
        assert.equal(matching, undefined);

        m.addToListeners('hello', t, 'm', 0);
        matching = m.matchingListeners('hello');

        // listener was added back successfully
        assert.equal(matching.length, 3);
        assert.equal(matching[0], t);
      });
    }
  }
);
