import { peekMeta } from '@ember/-internals/meta';
import ArrayProxy from '@ember/array/proxy';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

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
    beforeEach() {
      expectDeprecation(/`ArrayProxy` is deprecated/, DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isEnabled);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isRemoved)} @test setting 'content' adds listeners correctly`](
      assert
    ) {
      let content = [];
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

    [`${testUnless(DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isRemoved)} @test changing 'content' adds and removes listeners correctly`](
      assert
    ) {
      let content1 = [];
      let content2 = [];
      let proxy = ArrayProxy.create({ content: content1 });

      assert.deepEqual(sortedListenersFor(content1, '@array:before'), []);
      assert.deepEqual(sortedListenersFor(content1, '@array:change'), []);

      // setup proxy
      proxy.length;

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
  }
);
