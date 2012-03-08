// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/props/events_test');

test('listener should receive event - removing should remove', function() {
  var obj = {}, count = 0;
  var F = function() { count++; };

  Ember.addListener(obj, 'event!', F);
  equal(count, 0, 'nothing yet');

  Ember.sendEvent(obj, 'event!');
  equal(count, 1, 'received event');

  Ember.removeListener(obj, 'event!', F);

  count = 0;
  Ember.sendEvent(obj, 'event!');
  equal(count, 0, 'received event');
});

test('listeners should be inherited', function() {
  var obj = {}, count = 0;
  var F = function() { count++; };

  Ember.addListener(obj, 'event!', F);

  var obj2 = Ember.create(obj);

  equal(count, 0, 'nothing yet');

  Ember.sendEvent(obj2, 'event!');
  equal(count, 1, 'received event');

  Ember.removeListener(obj2, 'event!', F);

  count = 0;
  Ember.sendEvent(obj2, 'event!');
  equal(count, 0, 'did not receive event');

  Ember.sendEvent(obj, 'event!');
  equal(count, 1, 'should still invoke on parent');

});


test('adding a listener more than once should only invoke once', function() {

  var obj = {}, count = 0;
  var F = function() { count++; };
  Ember.addListener(obj, 'event!', F);
  Ember.addListener(obj, 'event!', F);

  Ember.sendEvent(obj, 'event!');
  equal(count, 1, 'should only invoke once');
});

test('adding a listener with a target should invoke with target', function() {
  var obj = {}, target;

  target = {
    count: 0,
    method: function() { this.count++; }
  };

  Ember.addListener(obj, 'event!', target, target.method);
  Ember.sendEvent(obj, 'event!');
  equal(target.count, 1, 'should invoke');
});

test('suspending a listener should not invoke during callback', function() {
  var obj = {}, target, otherTarget;

  target = {
    count: 0,
    method: function() { this.count++; }
  };

  otherTarget = {
    count: 0,
    method: function() { this.count++; }
  };

  Ember.addListener(obj, 'event!', target, target.method);
  Ember.addListener(obj, 'event!', otherTarget, otherTarget.method);

  function callback() {
      equal(this, target);

      Ember.sendEvent(obj, 'event!');

      return 'result';
  }

  Ember.sendEvent(obj, 'event!');
  
  equal(Ember._suspendListener(obj, 'event!', target, target.method, callback), 'result');

  Ember.sendEvent(obj, 'event!');

  equal(target.count, 2, 'should invoke');
  equal(otherTarget.count, 3, 'should invoke');
});

test('adding a listener with string method should lookup method on event delivery', function() {
  var obj = {}, target;

  target = {
    count: 0,
    method: function() {}
  };

  Ember.addListener(obj, 'event!', target, 'method');
  Ember.sendEvent(obj, 'event!');
  equal(target.count, 0, 'should invoke but do nothing');

  target.method = function() { this.count++; };
  Ember.sendEvent(obj, 'event!');
  equal(target.count, 1, 'should invoke now');
});

test('calling sendEvent with extra params should be passed to listeners', function() {

  var obj = {}, params = null;
  Ember.addListener(obj, 'event!', function() {
    params = Array.prototype.slice.call(arguments);
  });

  Ember.sendEvent(obj, 'event!', 'foo', 'bar');
  deepEqual(params, [obj, 'event!', 'foo', 'bar'], 'params should be saved');
});

test('implementing sendEvent on object should invoke', function() {
  var obj = {
    sendEvent: function(eventName, param1, param2) {
      equal(eventName, 'event!', 'eventName');
      equal(param1, 'foo', 'param1');
      equal(param2, 'bar', 'param2');
      this.count++;
    },

    count: 0
  };

  Ember.addListener(obj, 'event!', obj, function() { this.count++; });

  Ember.sendEvent(obj, 'event!', 'foo', 'bar');
  equal(obj.count, 2, 'should have invoked method & listener');
});

test('hasListeners tells you if there are listeners for a given event', function() {

  var obj = {}, F = function() {}, F2 = function() {};

  equal(Ember.hasListeners(obj, 'event!'), false, 'no listeners at first');

  Ember.addListener(obj, 'event!', F);
  Ember.addListener(obj, 'event!', F2);

  equal(Ember.hasListeners(obj, 'event!'), true, 'has listeners');

  Ember.removeListener(obj, 'event!', F);
  equal(Ember.hasListeners(obj, 'event!'), true, 'has listeners');

  Ember.removeListener(obj, 'event!', F2);
  equal(Ember.hasListeners(obj, 'event!'), false, 'has no more listeners');

  Ember.addListener(obj, 'event!', F);
  equal(Ember.hasListeners(obj, 'event!'), true, 'has listeners');
});

