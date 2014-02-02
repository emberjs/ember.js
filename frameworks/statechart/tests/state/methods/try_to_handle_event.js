// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var sc, root, foo, bar;

module("SC.State: addSubstate method Tests", {
  
  setup: function() {
    
    sc = SC.Statechart.create({
      
      stateWillTryToHandleEvent: function(state, event, handler) {
        sc_super();
        this.stateWillTryToHandleEventInfo = {
          state: state,
          event: event,
          handler: handler
        };
      },

      stateDidTryToHandleEvent: function(state, event, handler, handled) {
        sc_super();
        this.stateDidTryToHandleEventInfo = {
          state: state,
          event: event,
          handler: handler,
          handled: handled
        };
      },
      
      initialState: 'foo',
      
      foo: SC.State.design({
        
        eventHandlerReturnValue: YES,
        
        _notifyHandledEvent: function(handler, event, arg1, arg2) {
          this.handledEventInfo = {
            handler: handler,
            event: event,
            arg1: arg1,
            arg2: arg2
          };
        },
        
        eventHandler1: function(arg1, arg2) {
          this._notifyHandledEvent('eventHandler1', 'eventHandler1', arg1, arg2);
          return this.get('eventHandlerReturnValue');
        },
        
        eventHandler2: function(event, arg1, arg2) {
          this._notifyHandledEvent('eventHandler2', event, arg1, arg2);
          return this.get('eventHandlerReturnValue');
        }.handleEvents('test1'),
        
        eventHandler3: function(event, arg1, arg2) {
          this._notifyHandledEvent('eventHandler3', event, arg1, arg2);
          return this.get('eventHandlerReturnValue');
        }.handleEvents(/^digit[0-9]$/),
        
        unknownEvent: function(event, arg1, arg2) {
          this._notifyHandledEvent('unknownEvent', event, arg1, arg2);
          return this.get('eventHandlerReturnValue');
        }
        
      })
      
    });
    
    sc.initStatechart();
    foo = sc.getState('foo');
  },
  
  teardown: function() {
    sc = foo = null;
  }
  
});

test("try to invoke state foo's eventHandler1 event handler", function() {
  
  var ret = foo.tryToHandleEvent('eventHandler1', 100, 200);
  
  var info = foo.handledEventInfo;
  
  equals(ret, true, 'foo.tryToHandleEvent should return true');
  ok(info, 'foo.handledEventInfo should not be null');
  equals(info.handler, 'eventHandler1', 'foo.eventHandler1 should have been invoked');
  equals(info.arg1, 100, 'foo.eventHandler1 should handle event 100');
  equals(info.arg2, 200, 'foo.eventHandler1 should handle event 200');

  info = sc.stateWillTryToHandleEventInfo;
  
  ok(info, 'sc.stateWillTryToHandleEvent should have been invoked');
  equals(info.state, foo, 'sc.stateWillTryToHandleEvent should have been passed state foo');
  equals(info.event, 'eventHandler1', 'sc.stateWillTryToHandleEvent should have been passed event eventHandler1');
  equals(info.handler, 'eventHandler1', 'sc.stateWillTryToHandleEvent should have been passed handler eventHandler1');
  
  info = sc.stateDidTryToHandleEventInfo;
  
  ok(info, 'sc.stateDidTryToHandleEventInfo should have been invoked');
  equals(info.state, foo, 'sc.stateDidTryToHandleEventInfo should have been passed state foo');
  equals(info.event, 'eventHandler1', 'sc.stateDidTryToHandleEventInfo should have been passed event eventHandler1');
  equals(info.handler, 'eventHandler1', 'sc.stateDidTryToHandleEventInfo should have been passed handler eventHandler1');
  equals(info.handled, true, 'sc.stateDidTryToHandleEventInfo should have been passed handled true');
  
});

test("try to invoke state foo's eventHandler2 event handler", function() {
  
  var ret = foo.tryToHandleEvent('test1', 100, 200);
  
  var info = foo.handledEventInfo;
  
  equals(ret, true, 'foo.tryToHandleEvent should return true');
  ok(info, 'foo.handledEventInfo should not be null');
  equals(info.handler, 'eventHandler2', 'foo.eventHandler2 should have been invoked');
  equals(info.event, 'test1', 'foo.eventHandler2 should handle event test1');
  equals(info.arg1, 100, 'foo.eventHandler2 should handle event 100');
  equals(info.arg2, 200, 'foo.eventHandler2 should handle event 200');

  info = sc.stateWillTryToHandleEventInfo;
  
  ok(info, 'sc.stateWillTryToHandleEvent should have been invoked');
  equals(info.state, foo, 'sc.stateWillTryToHandleEvent should have been passed state foo');
  equals(info.event, 'test1', 'sc.stateWillTryToHandleEvent should have been passed event test1');
  equals(info.handler, 'eventHandler2', 'sc.stateWillTryToHandleEvent should have been passed handler eventHandler2');
  
  info = sc.stateDidTryToHandleEventInfo;
  
  ok(info, 'sc.stateDidTryToHandleEventInfo should have been invoked');
  equals(info.state, foo, 'sc.stateDidTryToHandleEventInfo should have been passed state foo');
  equals(info.event, 'test1', 'sc.stateDidTryToHandleEventInfo should have been passed event test1');
  equals(info.handler, 'eventHandler2', 'sc.stateDidTryToHandleEventInfo should have been passed handler eventHandler2');
  equals(info.handled, true, 'sc.stateDidTryToHandleEventInfo should have been passed handled true');
  
});

test("try to invoke state foo's eventHandler3 event handler", function() {
  
  var ret = foo.tryToHandleEvent('digit3', 100, 200);
  
  var info = foo.handledEventInfo;
  
  equals(ret, true, 'foo.tryToHandleEvent should return true');
  ok(info, 'foo.handledEventInfo should not be null');
  equals(info.handler, 'eventHandler3', 'foo.eventHandler3 should have been invoked');
  equals(info.event, 'digit3', 'foo.eventHandler3 should handle event test1');
  equals(info.arg1, 100, 'foo.eventHandler3 should handle event 100');
  equals(info.arg2, 200, 'foo.eventHandler3 should handle event 200');

  info = sc.stateWillTryToHandleEventInfo;
  
  ok(info, 'sc.stateWillTryToHandleEvent should have been invoked');
  equals(info.state, foo, 'sc.stateWillTryToHandleEvent should have been passed state foo');
  equals(info.event, 'digit3', 'sc.stateWillTryToHandleEvent should have been passed event digit3');
  equals(info.handler, 'eventHandler3', 'sc.stateWillTryToHandleEvent should have been passed handler eventHandler3');
  
  info = sc.stateDidTryToHandleEventInfo;
  
  ok(info, 'sc.stateDidTryToHandleEventInfo should have been invoked');
  equals(info.state, foo, 'sc.stateDidTryToHandleEventInfo should have been passed state foo');
  equals(info.event, 'digit3', 'sc.stateDidTryToHandleEventInfo should have been passed event digit3');
  equals(info.handler, 'eventHandler3', 'sc.stateDidTryToHandleEventInfo should have been passed handler eventHandler3');
  equals(info.handled, true, 'sc.stateDidTryToHandleEventInfo should have been passed handled true');
  
});

test("try to invoke state foo's unknownEvent event handler", function() {
  
  var ret = foo.tryToHandleEvent('test', 100, 200);
  
  var info = foo.handledEventInfo;
  
  equals(ret, true, 'foo.tryToHandleEvent should return true');
  ok(info, 'foo.handledEventInfo should not be null');
  equals(info.handler, 'unknownEvent', 'foo.unknownEvent should have been invoked');
  equals(info.event, 'test', 'foo.unknownEvent should handle event test');
  equals(info.arg1, 100, 'foo.unknownEvent should handle event 100');
  equals(info.arg2, 200, 'foo.unknownEvent should handle event 200');

  info = sc.stateWillTryToHandleEventInfo;
  
  ok(info, 'sc.stateWillTryToHandleEvent should have been invoked');
  equals(info.state, foo, 'sc.stateWillTryToHandleEvent should have been passed state foo');
  equals(info.event, 'test', 'sc.stateWillTryToHandleEvent should have been passed event test');
  equals(info.handler, 'unknownEvent', 'sc.stateWillTryToHandleEvent should have been passed handler unknownEvent');
  
  info = sc.stateDidTryToHandleEventInfo;
  
  ok(info, 'sc.stateDidTryToHandleEventInfo should have been invoked');
  equals(info.state, foo, 'sc.stateDidTryToHandleEventInfo should have been passed state foo');
  equals(info.event, 'test', 'sc.stateDidTryToHandleEventInfo should have been passed event test');
  equals(info.handler, 'unknownEvent', 'sc.stateDidTryToHandleEventInfo should have been passed handler unknownEvent');
  equals(info.handled, true, 'sc.stateDidTryToHandleEventInfo should have been passed handled true');
  
});

test("try not to invoke any of state foo's event handlers", function() {
  
  foo.unknownEvent = undefined;
  
  var ret = foo.tryToHandleEvent('test', 100, 200);
  
  var info = foo.handledEventInfo;
  
  equals(ret, NO, 'foo.tryToHandleEvent should return false');
  ok(!info, 'foo.handledEventInfo should be null');

  info = sc.stateWillTryToHandleEventInfo;
  ok(!info, 'sc.stateWillTryToHandleEvent should not have been invoked');

  info = sc.stateDidTryToHandleEventInfo;
  ok(!info, 'sc.stateDidTryToHandleEventInfo should not have been invoked');
  
});

test("try to invoke state foo's eventHandler1 but tryToHandleEvent returns false", function() {
  foo.eventHandlerReturnValue = NO;
  
  var ret = foo.tryToHandleEvent('eventHandler1', 100, 200);
  
  var info = foo.handledEventInfo;
  
  equals(ret, NO, 'foo.tryToHandleEvent should return false');
  ok(info, 'foo.handledEventInfo should be null');
  equals(info.handler, 'eventHandler1', 'foo.eventHandler1 should have been invoked');
  equals(info.event, 'eventHandler1', 'foo.eventHandler1 should handle event test');
  equals(info.arg1, 100, 'foo.eventHandler1 should handle event 100');
  equals(info.arg2, 200, 'foo.eventHandler1 should handle event 200');

  info = sc.stateWillTryToHandleEventInfo;
  ok(info, 'sc.stateWillTryToHandleEvent should not have been invoked');
  equals(info.state, foo, 'sc.stateWillTryToHandleEvent should have been passed state foo');
  equals(info.event, 'eventHandler1', 'sc.stateWillTryToHandleEvent should have been passed event test');
  equals(info.handler, 'eventHandler1', 'sc.stateWillTryToHandleEvent should have been passed handler eventHandler1');

  info = sc.stateDidTryToHandleEventInfo;
  ok(info, 'sc.stateDidTryToHandleEventInfo should not have been invoked');
  equals(info.state, foo, 'sc.stateDidTryToHandleEventInfo should have been passed state foo');
  equals(info.event, 'eventHandler1', 'sc.stateDidTryToHandleEventInfo should have been passed event test');
  equals(info.handler, 'eventHandler1', 'sc.stateDidTryToHandleEventInfo should have been passed handler eventHandler1');
  equals(info.handled, false, 'sc.stateDidTryToHandleEventInfo should have been passed handled false');
});

test("try to invoke all of state foo's handlers but tryToHandleEvent returns false", function() {
  var ret, info;
  
  foo.eventHandlerReturnValue = NO;
  
  ret = foo.tryToHandleEvent('eventHandler1');
  
  equals(ret, NO, 'foo.tryToHandleEvent should return false');
  info = foo.handledEventInfo;
  ok(info, 'foo.handledEventInfo should be null');
  equals(info.handler, 'eventHandler1', 'foo.eventHandler1 should have been invoked');
  ok(sc.stateWillTryToHandleEventInfo, 'sc.stateWillTryToHandleEvent should not have been invoked');
  ok(sc.stateDidTryToHandleEventInfo, 'sc.stateDidTryToHandleEventInfo should not have been invoked');
  
  ret = foo.tryToHandleEvent('test1');
  
  equals(ret, NO, 'foo.tryToHandleEvent should return false for event test1');
  info = foo.handledEventInfo;
  ok(info, 'foo.handledEventInfo should be null');
  equals(info.handler, 'eventHandler2', 'foo.eventHandler2 should have been invoked');
  ok(sc.stateWillTryToHandleEventInfo, 'sc.stateWillTryToHandleEvent should not have been invoked');
  ok(sc.stateDidTryToHandleEventInfo, 'sc.stateDidTryToHandleEventInfo should not have been invoked');
  
  ret = foo.tryToHandleEvent('digit3');
  
  equals(ret, NO, 'foo.tryToHandleEvent should return false for event digit3');
  info = foo.handledEventInfo;
  ok(info, 'foo.handledEventInfo should be null');
  equals(info.handler, 'eventHandler3', 'foo.eventHandler3 should have been invoked');
  ok(sc.stateWillTryToHandleEventInfo, 'sc.stateWillTryToHandleEvent should not have been invoked');
  ok(sc.stateDidTryToHandleEventInfo, 'sc.stateDidTryToHandleEventInfo should not have been invoked');
  
  ret = foo.tryToHandleEvent('blah');
  
  equals(ret, NO, 'foo.tryToHandleEvent should return false for event blah');
  info = foo.handledEventInfo;
  ok(info, 'foo.handledEventInfo should be null');
  equals(info.handler, 'unknownEvent', 'foo.unknownEvent should have been invoked');
  ok(sc.stateWillTryToHandleEventInfo, 'sc.stateWillTryToHandleEvent should not have been invoked');
  ok(sc.stateDidTryToHandleEventInfo, 'sc.stateDidTryToHandleEventInfo should not have been invoked');
});