import Ember from 'ember-metal/core';
import {set} from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import ArrayProxy from 'ember-runtime/system/array_proxy';

QUnit.module('ArrayProxy - content change');

QUnit.test('should update length for null content', function() {
  var proxy = ArrayProxy.create({
        content: Ember.A([1, 2, 3])
      });

  equal(proxy.get('length'), 3, 'precond - length is 3');

  proxy.set('content', null);

  equal(proxy.get('length'), 0, 'length updates');
});

QUnit.test('should update length for null content when there is a computed property watching length', function() {
  var proxy = ArrayProxy.extend({
    isEmpty: Ember.computed.not('length')
  }).create({
    content: Ember.A([1, 2, 3])
  });

  equal(proxy.get('length'), 3, 'precond - length is 3');

  // Consume computed property that depends on length
  proxy.get('isEmpty');

  // update content
  proxy.set('content', null);

  equal(proxy.get('length'), 0, 'length updates');
});

QUnit.test('The `arrangedContentWillChange` method is invoked before `content` is changed.', function() {
  var callCount = 0;
  var expectedLength;

  var proxy = ArrayProxy.extend({
    arrangedContentWillChange() {
      equal(this.get('arrangedContent.length'), expectedLength, 'hook should be invoked before array has changed');
      callCount++;
    }
  }).create({ content: Ember.A([1, 2, 3]) });

  proxy.pushObject(4);
  equal(callCount, 0, 'pushing content onto the array doesn\'t trigger it');

  proxy.get('content').pushObject(5);
  equal(callCount, 0, 'pushing content onto the content array doesn\'t trigger it');

  expectedLength = 5;
  proxy.set('content', Ember.A(['a', 'b']));
  equal(callCount, 1, 'replacing the content array triggers the hook');
});

QUnit.test('The `arrangedContentDidChange` method is invoked after `content` is changed.', function() {
  var callCount = 0;
  var expectedLength;

  var proxy = ArrayProxy.extend({
    arrangedContentDidChange() {
      equal(this.get('arrangedContent.length'), expectedLength, 'hook should be invoked after array has changed');
      callCount++;
    }
  }).create({
    content: Ember.A([1, 2, 3])
  });

  equal(callCount, 0, 'hook is not called after creating the object');

  proxy.pushObject(4);
  equal(callCount, 0, 'pushing content onto the array doesn\'t trigger it');

  proxy.get('content').pushObject(5);
  equal(callCount, 0, 'pushing content onto the content array doesn\'t trigger it');

  expectedLength = 2;
  proxy.set('content', Ember.A(['a', 'b']));
  equal(callCount, 1, 'replacing the content array triggers the hook');
});

QUnit.test('The ArrayProxy doesn\'t explode when assigned a destroyed object', function() {
  var proxy1 = ArrayProxy.create();
  var proxy2 = ArrayProxy.create();

  run(function() {
    proxy1.destroy();
  });

  set(proxy2, 'content', proxy1);

  ok(true, 'No exception was raised');
});
