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

QUnit.test('The `arrangedContentWillChange` method is invoked before `content` is changed.', function() {
  let callCount = 0;
  let expectedLength;

  let proxy = ArrayProxy.extend({
    arrangedContentWillChange() {
      equal(this.get('arrangedContent.length'), expectedLength, 'hook should be invoked before array has changed');
      callCount++;
    }
  }).create({ content: emberA([1, 2, 3]) });

  proxy.pushObject(4);
  equal(callCount, 0, 'pushing content onto the array doesn\'t trigger it');

  proxy.get('content').pushObject(5);
  equal(callCount, 0, 'pushing content onto the content array doesn\'t trigger it');

  expectedLength = 5;
  proxy.set('content', emberA(['a', 'b']));
  equal(callCount, 1, 'replacing the content array triggers the hook');
});

QUnit.test('The `arrangedContentDidChange` method is invoked after `content` is changed.', function() {
  let callCount = 0;
  let expectedLength;

  let proxy = ArrayProxy.extend({
    arrangedContentDidChange() {
      equal(this.get('arrangedContent.length'), expectedLength, 'hook should be invoked after array has changed');
      callCount++;
    }
  }).create({
    content: emberA([1, 2, 3])
  });

  equal(callCount, 0, 'hook is not called after creating the object');

  proxy.pushObject(4);
  equal(callCount, 0, 'pushing content onto the array doesn\'t trigger it');

  proxy.get('content').pushObject(5);
  equal(callCount, 0, 'pushing content onto the content array doesn\'t trigger it');

  expectedLength = 2;
  proxy.set('content', emberA(['a', 'b']));
  equal(callCount, 1, 'replacing the content array triggers the hook');
});

QUnit.test('The ArrayProxy doesn\'t explode when assigned a destroyed object', function() {
  let proxy1 = ArrayProxy.create();
  let proxy2 = ArrayProxy.create();

  run(() => proxy1.destroy());

  set(proxy2, 'content', proxy1);

  ok(true, 'No exception was raised');
});

QUnit.test('arrayContent{Will,Did}Change are called when the content changes', function() {
  // The behavior covered by this test may change in the future if we decide
  // that built-in array methods are not overridable.

  let willChangeCallCount = 0;
  let didChangeCallCount = 0;

  let content = emberA([1, 2, 3]);
  ArrayProxy.extend({
    arrayContentWillChange() {
      willChangeCallCount++;
      this._super(...arguments);
    },
    arrayContentDidChange() {
      didChangeCallCount++;
      this._super(...arguments);
    }
  }).create({ content });

  equal(willChangeCallCount, 0);
  equal(didChangeCallCount, 0);

  content.pushObject(4);
  content.pushObject(5);

  equal(willChangeCallCount, 2);
  equal(didChangeCallCount, 2);
});
