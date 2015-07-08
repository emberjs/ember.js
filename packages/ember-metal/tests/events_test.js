import { Mixin } from 'ember-metal/mixin';
import { meta } from 'ember-metal/utils';

import {
  on,
  addListener,
  removeListener,
  suspendListener,
  suspendListeners,
  sendEvent,
  hasListeners
} from 'ember-metal/events';

QUnit.module('system/props/events_test');

QUnit.test('listener should receive event - removing should remove', function() {
  var obj = {};
  var count = 0;
  var F = function() { count++; };

  addListener(obj, 'event!', F);
  equal(count, 0, 'nothing yet');

  sendEvent(obj, 'event!');
  equal(count, 1, 'received event');

  removeListener(obj, 'event!', F);

  count = 0;
  sendEvent(obj, 'event!');
  equal(count, 0, 'received event');
});

QUnit.test('listeners should be inherited', function() {
  var obj = {};
  var count = 0;
  var F = function() { count++; };

  addListener(obj, 'event!', F);

  var obj2 = Object.create(obj);

  equal(count, 0, 'nothing yet');

  sendEvent(obj2, 'event!');
  equal(count, 1, 'received event');

  removeListener(obj2, 'event!', F);

  count = 0;
  sendEvent(obj2, 'event!');
  equal(count, 0, 'did not receive event');

  sendEvent(obj, 'event!');
  equal(count, 1, 'should still invoke on parent');
});


QUnit.test('adding a listener more than once should only invoke once', function() {
  var obj = {};
  var count = 0;
  var F = function() { count++; };
  addListener(obj, 'event!', F);
  addListener(obj, 'event!', F);

  sendEvent(obj, 'event!');
  equal(count, 1, 'should only invoke once');
});

QUnit.test('adding a listener with a target should invoke with target', function() {
  var obj = {};
  var target;

  target = {
    count: 0,
    method() { this.count++; }
  };

  addListener(obj, 'event!', target, target.method);
  sendEvent(obj, 'event!');
  equal(target.count, 1, 'should invoke');
});

QUnit.test('suspending a listener should not invoke during callback', function() {
  var obj = {};
  var target, otherTarget;

  target = {
    count: 0,
    method() { this.count++; }
  };

  otherTarget = {
    count: 0,
    method() { this.count++; }
  };

  addListener(obj, 'event!', target, target.method);
  addListener(obj, 'event!', otherTarget, otherTarget.method);

  function callback() {
    /*jshint validthis:true */
    equal(this, target);

    sendEvent(obj, 'event!');

    return 'result';
  }

  sendEvent(obj, 'event!');

  equal(suspendListener(obj, 'event!', target, target.method, callback), 'result');

  sendEvent(obj, 'event!');

  equal(target.count, 2, 'should invoke');
  equal(otherTarget.count, 3, 'should invoke');
});

QUnit.test('adding a listener with string method should lookup method on event delivery', function() {
  var obj = {};
  var target;

  target = {
    count: 0,
    method() {}
  };

  addListener(obj, 'event!', target, 'method');
  sendEvent(obj, 'event!');
  equal(target.count, 0, 'should invoke but do nothing');

  target.method = function() { this.count++; };
  sendEvent(obj, 'event!');
  equal(target.count, 1, 'should invoke now');
});

QUnit.test('calling sendEvent with extra params should be passed to listeners', function() {
  var obj = {};
  var params = null;
  addListener(obj, 'event!', function() {
    params = Array.prototype.slice.call(arguments);
  });

  sendEvent(obj, 'event!', ['foo', 'bar']);
  deepEqual(params, ['foo', 'bar'], 'params should be saved');
});

QUnit.test('implementing sendEvent on object should invoke', function() {
  var obj = {
    sendEvent(eventName, params) {
      equal(eventName, 'event!', 'eventName');
      deepEqual(params, ['foo', 'bar']);
      this.count++;
    },

    count: 0
  };

  addListener(obj, 'event!', obj, function() { this.count++; });

  sendEvent(obj, 'event!', ['foo', 'bar']);
  equal(obj.count, 2, 'should have invoked method & listener');
});

QUnit.test('hasListeners tells you if there are listeners for a given event', function() {
  var obj = {};
  var F = function() {};
  var F2 = function() {};

  equal(hasListeners(obj, 'event!'), false, 'no listeners at first');

  addListener(obj, 'event!', F);
  addListener(obj, 'event!', F2);

  equal(hasListeners(obj, 'event!'), true, 'has listeners');

  removeListener(obj, 'event!', F);
  equal(hasListeners(obj, 'event!'), true, 'has listeners');

  removeListener(obj, 'event!', F2);
  equal(hasListeners(obj, 'event!'), false, 'has no more listeners');

  addListener(obj, 'event!', F);
  equal(hasListeners(obj, 'event!'), true, 'has listeners');
});

QUnit.test('calling removeListener without method should remove all listeners', function() {
  var obj = {};
  var F = function() {};
  var F2 = function() {};

  equal(hasListeners(obj, 'event!'), false, 'no listeners at first');

  addListener(obj, 'event!', F);
  addListener(obj, 'event!', F2);

  equal(hasListeners(obj, 'event!'), true, 'has listeners');

  removeListener(obj, 'event!');

  equal(hasListeners(obj, 'event!'), false, 'has no more listeners');
});

QUnit.test('while suspended, it should not be possible to add a duplicate listener', function() {
  var obj = {};
  var target;

  target = {
    count: 0,
    method() { this.count++; }
  };

  addListener(obj, 'event!', target, target.method);

  function callback() {
    addListener(obj, 'event!', target, target.method);
  }

  sendEvent(obj, 'event!');

  suspendListener(obj, 'event!', target, target.method, callback);

  equal(target.count, 1, 'should invoke');
  equal(meta(obj).listeners['event!'].length, 3, 'a duplicate listener wasn\'t added');

  // now test suspendListeners...

  sendEvent(obj, 'event!');

  suspendListeners(obj, ['event!'], target, target.method, callback);

  equal(target.count, 2, 'should have invoked again');
  equal(meta(obj).listeners['event!'].length, 3, 'a duplicate listener wasn\'t added');
});

QUnit.test('a listener can be added as part of a mixin', function() {
  var triggered = 0;
  var MyMixin = Mixin.create({
    foo1: on('bar', function() {
      triggered++;
    }),

    foo2: on('bar', function() {
      triggered++;
    })
  });

  var obj = {};
  MyMixin.apply(obj);

  sendEvent(obj, 'bar');
  equal(triggered, 2, 'should invoke listeners');
});

QUnit.test('a listener added as part of a mixin may be overridden', function() {
  var triggered = 0;
  var FirstMixin = Mixin.create({
    foo: on('bar', function() {
      triggered++;
    })
  });
  var SecondMixin = Mixin.create({
    foo: on('baz', function() {
      triggered++;
    })
  });

  var obj = {};
  FirstMixin.apply(obj);
  SecondMixin.apply(obj);

  sendEvent(obj, 'bar');
  equal(triggered, 0, 'should not invoke from overriden property');

  sendEvent(obj, 'baz');
  equal(triggered, 1, 'should invoke from subclass property');
});
