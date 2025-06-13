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
      let matching;
      let target = {};
      let parent = {};
      let parentMeta = meta(parent);
      parentMeta.addToListeners('hello', target, 'm', 0);

      let child1 = Object.create(parent);
      let m1 = meta(child1);

      let child2 = Object.create(parent);
      let m2 = meta(child2);

      let child3 = Object.create(parent);
      let m3 = meta(child3);

      m3.removeFromListeners('hello', target, 'm');

      matching = m3.matchingListeners('hello');
      assert.deepEqual(matching, undefined, 'no listeners for child3');

      m3.addToListeners('hello', target, 'm', 0);

      matching = m3.matchingListeners('hello');
      assert.deepEqual(matching, [target, 'm', false], 'listener still exists for child1');

      m3.removeFromListeners('hello', target, 'm');

      matching = m3.matchingListeners('hello');
      assert.deepEqual(matching, undefined, 'no listeners for child3');

      matching = m1.matchingListeners('hello');
      assert.deepEqual(matching, [target, 'm', false], 'listener still exists for child1');

      matching = m2.matchingListeners('hello');
      assert.deepEqual(matching, [target, 'm', false], 'listener still exists for child2');

      m1.removeFromListeners('hello', target, 'm');

      matching = m1.matchingListeners('hello');
      assert.equal(matching, undefined, 'listener removed from child1');

      matching = m2.matchingListeners('hello');
      assert.deepEqual(matching, [target, 'm', false], 'listener still exists for child2');

      matching = parentMeta.matchingListeners('hello');
      assert.deepEqual(matching, [target, 'm', false], 'listener still present for parent');
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

    '@test removed listeners are removed from the underlying structure GH#1112213'(assert) {
      // this is using private API to confirm the underlying data structure is properly maintained
      // and should be changed to match the data structure as needed

      class Class1 {}
      let class1Meta = meta(Class1.prototype);
      class1Meta.addToListeners('hello', null, 'm', 0);

      let instance1 = new Class1();
      let m1 = meta(instance1);

      function listenerFunc() {}

      m1.removeFromListeners('hello', null, 'm', 0);

      m1.addToListeners('stringListener', null, 'm', 0);
      m1.addToListeners('functionListener', null, listenerFunc, 0);

      m1.removeFromListeners('functionListener', null, listenerFunc, 0);
      m1.removeFromListeners('stringListener', null, 'm', 0);

      assert.equal(
        m1.flattenedListeners().length,
        1,
        'instance listeners correctly removed, inherited listeners remain'
      );
    }
  }
);
