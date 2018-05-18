import { peekMeta } from 'ember-meta';
import { get, addObserver, defineProperty, watcherCount, computed } from 'ember-metal';
import ArrayProxy from '../../../lib/system/array_proxy';
import { A } from '../../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function sortedListenersFor(obj, eventName) {
  let listeners = peekMeta(obj).matchingListeners(eventName) || [];

  let keys = [];
  for (let i = 0; i < listeners.length; i += 3) {
    keys.push(listeners[i + 1]);
  }
  return keys.sort();
}

moduleFor(
  'ArrayProxy - watching and listening',
  class extends AbstractTestCase {
    [`@test setting 'content' adds listeners correctly`](assert) {
      let content = A();
      let proxy = ArrayProxy.create();

      assert.deepEqual(sortedListenersFor(content, '@array:before'), []);
      assert.deepEqual(sortedListenersFor(content, '@array:change'), []);

      proxy.set('content', content);

      assert.deepEqual(sortedListenersFor(content, '@array:before'), [
        '_arrangedContentArrayWillChange',
      ]);
      assert.deepEqual(sortedListenersFor(content, '@array:change'), [
        '_arrangedContentArrayDidChange',
      ]);
    }

    [`@test changing 'content' adds and removes listeners correctly`](assert) {
      let content1 = A();
      let content2 = A();
      let proxy = ArrayProxy.create({ content: content1 });

      assert.deepEqual(sortedListenersFor(content1, '@array:before'), [
        '_arrangedContentArrayWillChange',
      ]);
      assert.deepEqual(sortedListenersFor(content1, '@array:change'), [
        '_arrangedContentArrayDidChange',
      ]);

      proxy.set('content', content2);

      assert.deepEqual(sortedListenersFor(content1, '@array:before'), []);
      assert.deepEqual(sortedListenersFor(content1, '@array:change'), []);
      assert.deepEqual(sortedListenersFor(content2, '@array:before'), [
        '_arrangedContentArrayWillChange',
      ]);
      assert.deepEqual(sortedListenersFor(content2, '@array:change'), [
        '_arrangedContentArrayDidChange',
      ]);
    }

    [`@test regression test for https://github.com/emberjs/ember.js/issues/12475`](assert) {
      let item1a = { id: 1 };
      let item1b = { id: 2 };
      let item1c = { id: 3 };
      let content1 = A([item1a, item1b, item1c]);

      let proxy = ArrayProxy.create({ content: content1 });
      let obj = { proxy };

      defineProperty(
        obj,
        'ids',
        computed('proxy.@each.id', function() {
          return get(this, 'proxy').mapBy('id');
        })
      );

      // These manually added observers are to simulate the observers added by the
      // rendering process in a template like:
      //
      // {{#each items as |item|}}
      //   {{item.id}}
      // {{/each}}
      addObserver(item1a, 'id', function() {});
      addObserver(item1b, 'id', function() {});
      addObserver(item1c, 'id', function() {});

      // The EachProxy has not yet been consumed. Only the manually added
      // observers are watching.
      assert.equal(watcherCount(item1a, 'id'), 1);
      assert.equal(watcherCount(item1b, 'id'), 1);
      assert.equal(watcherCount(item1c, 'id'), 1);

      // Consume the each proxy. This causes the EachProxy to add two observers
      // per item: one for "before" events and one for "after" events.
      assert.deepEqual(get(obj, 'ids'), [1, 2, 3]);

      // For each item, the two each proxy observers and one manual added observer
      // are watching.
      assert.equal(watcherCount(item1a, 'id'), 2);
      assert.equal(watcherCount(item1b, 'id'), 2);
      assert.equal(watcherCount(item1c, 'id'), 2);

      // This should be a no-op because observers do not fire if the value
      // 1. is an object and 2. is the same as the old value.
      proxy.set('content', content1);

      assert.equal(watcherCount(item1a, 'id'), 2);
      assert.equal(watcherCount(item1b, 'id'), 2);
      assert.equal(watcherCount(item1c, 'id'), 2);

      // This is repeated to catch the regression. It should still be a no-op.
      proxy.set('content', content1);

      assert.equal(watcherCount(item1a, 'id'), 2);
      assert.equal(watcherCount(item1b, 'id'), 2);
      assert.equal(watcherCount(item1c, 'id'), 2);

      // Set the content to a new array with completely different items and
      // repeat the process.
      let item2a = { id: 4 };
      let item2b = { id: 5 };
      let item2c = { id: 6 };
      let content2 = A([item2a, item2b, item2c]);

      addObserver(item2a, 'id', function() {});
      addObserver(item2b, 'id', function() {});
      addObserver(item2c, 'id', function() {});

      proxy.set('content', content2);

      assert.deepEqual(get(obj, 'ids'), [4, 5, 6]);

      assert.equal(watcherCount(item2a, 'id'), 2);
      assert.equal(watcherCount(item2b, 'id'), 2);
      assert.equal(watcherCount(item2c, 'id'), 2);

      // Ensure that the observers added by the EachProxy on all items in the
      // first content array have been torn down.
      assert.equal(watcherCount(item1a, 'id'), 1);
      assert.equal(watcherCount(item1b, 'id'), 1);
      assert.equal(watcherCount(item1c, 'id'), 1);

      proxy.set('content', content2);

      assert.equal(watcherCount(item2a, 'id'), 2);
      assert.equal(watcherCount(item2b, 'id'), 2);
      assert.equal(watcherCount(item2c, 'id'), 2);

      proxy.set('content', content2);

      assert.equal(watcherCount(item2a, 'id'), 2);
      assert.equal(watcherCount(item2b, 'id'), 2);
      assert.equal(watcherCount(item2c, 'id'), 2);
    }
  }
);
