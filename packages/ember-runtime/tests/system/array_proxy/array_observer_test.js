import { set } from 'ember-metal';
import ArrayProxy from '../../../system/array_proxy';
import { A } from '../../../system/native_array';

QUnit.module('ArrayProxy - array observers');

QUnit.test('mutating content', assert => {
  assert.expect(4);

  let content = A(['x', 'y', 'z']);
  let proxy = ArrayProxy.create({ content });

  proxy.addArrayObserver({
    arrayWillChange(proxy, startIndex, removeCount, addCount) {
      assert.deepEqual([startIndex, removeCount, addCount], [1, 1, 3]);
      assert.deepEqual(proxy.toArray(), ['x', 'y', 'z']);
    },
    arrayDidChange(proxy, startIndex, removeCount, addCount) {
      assert.deepEqual([startIndex, removeCount, addCount], [1, 1, 3]);
      assert.deepEqual(proxy.toArray(), ['x', 'a', 'b', 'c', 'z']);
    }
  });

  proxy.toArray();
  content.replace(1, 1, ['a', 'b', 'c']);
});

QUnit.test('assigning content', assert => {
  assert.expect(4);

  let content = A(['x', 'y', 'z']);
  let proxy = ArrayProxy.create({ content });

  proxy.addArrayObserver({
    arrayWillChange(proxy, startIndex, removeCount, addCount) {
      assert.deepEqual([startIndex, removeCount, addCount], [0, 3, 5]);
      assert.deepEqual(proxy.toArray(), ['x', 'y', 'z']);
    },
    arrayDidChange(proxy, startIndex, removeCount, addCount) {
      assert.deepEqual([startIndex, removeCount, addCount], [0, 3, 5]);
      assert.deepEqual(proxy.toArray(), ['a', 'b', 'c', 'd', 'e']);
    }
  });

  proxy.toArray();
  set(proxy, 'content', A(['a', 'b', 'c', 'd', 'e']));
});
