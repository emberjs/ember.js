import { get, set, run, changeProperties } from 'ember-metal';
import { not } from '../../../computed/computed_macros';
import ArrayProxy from '../../../system/array_proxy';
import { A as emberA } from '../../../system/native_array';

QUnit.module('ArrayProxy - content change');

QUnit.test('should update length for null content', function() {
  let proxy = ArrayProxy.create({
    content: emberA([1, 2, 3])
  });

  equal(proxy.get('length'), 3, 'precond - length is 3');

  proxy.set('content', null);

  equal(proxy.get('length'), 0, 'length updates');
});

QUnit.test('should update length for null content when there is a computed property watching length', function() {
  let proxy = ArrayProxy.extend({
    isEmpty: not('length')
  }).create({
    content: emberA([1, 2, 3])
  });

  equal(proxy.get('length'), 3, 'precond - length is 3');

  // Consume computed property that depends on length
  proxy.get('isEmpty');

  // update content
  proxy.set('content', null);

  equal(proxy.get('length'), 0, 'length updates');
});

QUnit.test('The ArrayProxy doesn\'t explode when assigned a destroyed object', function() {
  let proxy1 = ArrayProxy.create();
  let proxy2 = ArrayProxy.create();

  run(() => proxy1.destroy());

  set(proxy2, 'content', proxy1);

  ok(true, 'No exception was raised');
});

QUnit.test('should update if content changes while change events are deferred', function(assert) {
  let proxy = ArrayProxy.create();

  assert.deepEqual(proxy.toArray(), []);

  changeProperties(() => {
    proxy.set('content', emberA([1, 2, 3]));
    assert.deepEqual(proxy.toArray(), [1, 2, 3]);
  });
});

QUnit.test('objectAt recomputes the object cache correctly', function(assert) {
  let indexes = [];

  let proxy = ArrayProxy.extend({
    objectAtContent(index) {
      indexes.push(index);
      return this.content[index];
    }
  }).create({
    content: emberA([1, 2, 3, 4, 5])
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
});

QUnit.test('getting length does not recompute the object cache', function(assert) {
  let indexes = [];

  let proxy = ArrayProxy.extend({
    objectAtContent(index) {
      indexes.push(index);
      return this.content[index];
    }
  }).create({
    content: emberA([1, 2, 3, 4, 5])
  });

  assert.equal(get(proxy, 'length'), 5);
  assert.deepEqual(indexes, []);

  indexes.length = 0;
  proxy.set('content', emberA([6, 7, 8]));
  assert.equal(get(proxy, 'length'), 3);
  assert.deepEqual(indexes, []);

  indexes.length = 0;
  proxy.content.replace(1, 0, [1, 2, 3]);
  assert.equal(get(proxy, 'length'), 6);
  assert.deepEqual(indexes, []);
});

QUnit.test('negative indexes are handled correctly', function(assert) {
  let indexes = [];

  let proxy = ArrayProxy.extend({
    objectAtContent(index) {
      indexes.push(index);
      return this.content[index];
    }
  }).create({
    content: emberA([1, 2, 3, 4, 5])
  });

  assert.deepEqual(proxy.toArray(), [1, 2, 3, 4, 5]);

  indexes.length = 0;

  proxy.content.replace(-1, 0, [7]);
  proxy.content.replace(-2, 0, [6]);

  assert.deepEqual(proxy.toArray(), [1, 2, 3, 4, 6, 7, 5]);
  assert.deepEqual(indexes, [4, 5, 6]);
});
