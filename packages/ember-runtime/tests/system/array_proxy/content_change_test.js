import { set, run } from 'ember-metal';
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
