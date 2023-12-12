import { run } from '@ember/runloop';
import { changeProperties } from '@ember/-internals/metal';
import { set } from '@ember/object';
import ArrayProxy from '@ember/array/proxy';
import { A as emberA } from '@ember/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ArrayProxy - content change',
  class extends AbstractTestCase {
    ["@test The ArrayProxy doesn't explode when assigned a destroyed object"](assert) {
      let proxy1 = ArrayProxy.create();
      let proxy2 = ArrayProxy.create();

      run(() => proxy1.destroy());

      set(proxy2, 'content', proxy1);

      assert.ok(true, 'No exception was raised');
    }

    ['@test should update if content changes while change events are deferred'](assert) {
      let proxy = ArrayProxy.create();

      assert.deepEqual(proxy.toArray(), []);

      changeProperties(() => {
        proxy.set('content', emberA([1, 2, 3]));
        assert.deepEqual(proxy.toArray(), [1, 2, 3]);
      });
    }

    ['@test objectAt recomputes the object cache correctly'](assert) {
      let indexes = [];

      let proxy = ArrayProxy.extend({
        objectAtContent(index) {
          indexes.push(index);
          return this.content[index];
        },
      }).create({
        content: emberA([1, 2, 3, 4, 5]),
      });

      assert.deepEqual(indexes, []);
      assert.deepEqual(proxy.objectAt(0), 1);
      assert.deepEqual(indexes, [0, 1, 2, 3, 4]);

      indexes.length = 0;
      proxy.set('content', emberA([1, 2, 3]));
      assert.deepEqual(proxy.objectAt(0), 1);
      assert.deepEqual(indexes, [0, 1, 2]);

      indexes.length = 0;
      proxy.content.replace(2, 0, [4, 5]);
      assert.deepEqual(proxy.objectAt(0), 1);
      assert.deepEqual(proxy.objectAt(1), 2);
      assert.deepEqual(indexes, []);
      assert.deepEqual(proxy.objectAt(2), 4);
      assert.deepEqual(indexes, [2, 3, 4]);
    }

    ['@test negative indexes are handled correctly'](assert) {
      let indexes = [];

      let proxy = ArrayProxy.extend({
        objectAtContent(index) {
          indexes.push(index);
          return this.content[index];
        },
      }).create({
        content: emberA([1, 2, 3, 4, 5]),
      });

      assert.deepEqual(proxy.toArray(), [1, 2, 3, 4, 5]);

      indexes.length = 0;

      proxy.content.replace(-1, 0, [7]);
      proxy.content.replace(-2, 0, [6]);

      assert.deepEqual(proxy.toArray(), [1, 2, 3, 4, 6, 7, 5]);
      assert.deepEqual(indexes, [4, 5, 6]);
    }
  }
);
