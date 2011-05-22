// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/props/events_test');

test('listener should receive event - removing should remove', function() {
  var obj = {}, count = 0;
  var F = function() { count++; };
  
  SC.addListener(obj, 'event!', F);
  equals(count, 0, 'nothing yet');
  
  SC.sendEvent(obj, 'event!');
  equals(count, 1, 'received event');
  
  SC.removeListener(obj, 'event!', F);

  count = 0;
  SC.sendEvent(obj, 'event!');
  equals(count, 0, 'received event');
});

test('listeners should be inherited', function() {
  var obj = {}, count = 0;
  var F = function() { count++; };

  SC.addListener(obj, 'event!', F);
  
  var obj2 = SC.create(obj);
  
  equals(count, 0, 'nothing yet');
  
  SC.sendEvent(obj2, 'event!');
  equals(count, 1, 'received event');

  SC.removeListener(obj2, 'event!', F);

  count = 0;
  SC.sendEvent(obj2, 'event!');
  equals(count, 0, 'did not receive event');
  
  SC.sendEvent(obj, 'event!');
  equals(count, 1, 'should still invoke on parent');
  
});


test('adding a listener more than once should only invoke once', function() {
  
  var obj = {}, count = 0;
  var F = function() { count++; };
  SC.addListener(obj, 'event!', F);
  SC.addListener(obj, 'event!', F);

  SC.sendEvent(obj, 'event!');
  equals(count, 1, 'should only invoke once');
});

test('adding a listener with a target should invoke with target', function() {
  var obj = {}, target;
  
  target = {
    count: 0,
    method: function() { this.count++; }
  };
  
  SC.addListener(obj, 'event!', target, target.method);
  SC.sendEvent(obj, 'event!');
  equals(target.count, 1, 'should invoke');  
});

test('adding a listener with string method should lookup method on event delivery', function() {
  var obj = {}, target;
  
  target = {
    count: 0,
    method: function() {}
  };
  
  SC.addListener(obj, 'event!', target, 'method');
  SC.sendEvent(obj, 'event!');
  equals(target.count, 0, 'should invoke but do nothing');  
  
  target.method = function() { this.count++; };
  SC.sendEvent(obj, 'event!');
  equals(target.count, 1, 'should invoke now');  
});

test('calling sendEvent with extra params should be passed to listeners', function() {

  var obj = {}, params = null;
  SC.addListener(obj, 'event!', function() { 
    params = Array.prototype.slice.call(arguments);
  });
  
  SC.sendEvent(obj, 'event!', 'foo', 'bar');
  same(params, [obj, 'event!', 'foo', 'bar'], 'params should be saved');  
});

test('implementing sendEvent on object should invoke', function() {
  var obj = {
    sendEvent: function(eventName, param1, param2) {
      equals(eventName, 'event!', 'eventName');
      equals(param1, 'foo', 'param1');
      equals(param2, 'bar', 'param2');
      this.count++;
    },
    
    count: 0
  };
  
  SC.addListener(obj, 'event!', obj, function() { this.count++; });
  
  SC.sendEvent(obj, 'event!', 'foo', 'bar');
  equals(obj.count, 2, 'should have invoked method & listener');
});

test('hasListeners tells you if there are listeners for a given event', function() {

  var obj = {}, F = function() {}, F2 = function() {};
  
  equals(SC.hasListeners(obj, 'event!'), false, 'no listeners at first');
  
  SC.addListener(obj, 'event!', F);
  SC.addListener(obj, 'event!', F2);

  equals(SC.hasListeners(obj, 'event!'), true, 'has listeners');

  SC.removeListener(obj, 'event!', F);
  equals(SC.hasListeners(obj, 'event!'), true, 'has listeners');

  SC.removeListener(obj, 'event!', F2);
  equals(SC.hasListeners(obj, 'event!'), false, 'has no more listeners');

  SC.addListener(obj, 'event!', F);
  equals(SC.hasListeners(obj, 'event!'), true, 'has listeners');
});

