import {
  Mixin,
  meta,
  on,
  addListener,
  removeListener,
  suspendListener,
  suspendListeners,
  sendEvent,
  hasListeners
} from '..';

QUnit.module('system/props/events_test');

QUnit.test('listener should receive event - removing should remove', function() {
  let obj = {};
  let count = 0;

  function F() { count++; }

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
  let obj = {};
  let count = 0;
  let F = function() { count++; };

  addListener(obj, 'event!', F);

  let obj2 = Object.create(obj);

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
  let obj = {};
  let count = 0;
  function F() { count++; }
  addListener(obj, 'event!', F);
  addListener(obj, 'event!', F);

  sendEvent(obj, 'event!');
  equal(count, 1, 'should only invoke once');
});

QUnit.test('adding a listener with a target should invoke with target', function() {
  let obj = {};
  let target;

  target = {
    count: 0,
    method() { this.count++; }
  };

  addListener(obj, 'event!', target, target.method);
  sendEvent(obj, 'event!');
  equal(target.count, 1, 'should invoke');
});

QUnit.test('suspending a listener should not invoke during callback', function() {
  let obj = {};
  let target, otherTarget;

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
  let obj = {};
  let target;

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
  let obj = {};
  let params = null;
  addListener(obj, 'event!', function() {
    params = Array.prototype.slice.call(arguments);
  });

  sendEvent(obj, 'event!', ['foo', 'bar']);
  deepEqual(params, ['foo', 'bar'], 'params should be saved');
});

QUnit.test('hasListeners tells you if there are listeners for a given event', function() {
  let obj = {};

  function F() {}
  function F2() {}

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
  let obj = {};
  function F() {}
  function F2() {}

  equal(hasListeners(obj, 'event!'), false, 'no listeners at first');

  addListener(obj, 'event!', F);
  addListener(obj, 'event!', F2);

  equal(hasListeners(obj, 'event!'), true, 'has listeners');
  removeListener(obj, 'event!');

  equal(hasListeners(obj, 'event!'), false, 'has no more listeners');
});

QUnit.test('while suspended, it should not be possible to add a duplicate listener', function() {
  let obj = {};
  let target;

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
  equal(meta(obj).matchingListeners('event!').length, 3, 'a duplicate listener wasn\'t added');

  // now test suspendListeners...

  sendEvent(obj, 'event!');

  suspendListeners(obj, ['event!'], target, target.method, callback);

  equal(target.count, 2, 'should have invoked again');
  equal(meta(obj).matchingListeners('event!').length, 3, 'a duplicate listener wasn\'t added');
});

QUnit.test('a listener can be added as part of a mixin', function() {
  let triggered = 0;
  let MyMixin = Mixin.create({
    foo1: on('bar', function() {
      triggered++;
    }),

    foo2: on('bar', function() {
      triggered++;
    })
  });

  let obj = {};
  MyMixin.apply(obj);

  sendEvent(obj, 'bar');
  equal(triggered, 2, 'should invoke listeners');
});

QUnit.test('Ember.on asserts for invalid arguments', function() {
  expectAssertion(()=> {
    Mixin.create({
      foo1: on('bar'),
    });
  }, 'on expects function as last argument');

  expectAssertion(()=> {
    Mixin.create({
      foo1: on(function(){}),
    });
  }, 'on called without valid event names');
});

QUnit.test('a listener added as part of a mixin may be overridden', function() {
  let triggered = 0;
  let FirstMixin = Mixin.create({
    foo: on('bar', function() {
      triggered++;
    })
  });
  let SecondMixin = Mixin.create({
    foo: on('baz', function() {
      triggered++;
    })
  });

  let obj = {};
  FirstMixin.apply(obj);
  SecondMixin.apply(obj);

  sendEvent(obj, 'bar');
  equal(triggered, 0, 'should not invoke from overridden property');

  sendEvent(obj, 'baz');
  equal(triggered, 1, 'should invoke from subclass property');
});
