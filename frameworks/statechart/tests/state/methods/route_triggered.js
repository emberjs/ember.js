// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var sc, del, foo;

module("SC.State: routeTriggered method Tests", {
  
  setup: function() {
    
    del = SC.Object.create(SC.StatechartDelegate, {
      
      info: {},
      
      returnValue: YES,
      
      statechartShouldStateHandleTriggeredRoute: function(statechart, state, context) {
        this.info.statechartShouldStateHandleTriggeredRoute = {
          statechart: statechart, 
          state: state, 
          context: context
        };
        
        return this.get('returnValue');
      },
      
      statechartStateCancelledHandlingTriggeredRoute: function(statechart, state, context) {
        this.info.statechartStateCancelledHandlingTriggeredRoute = {
          statechart: statechart, 
          state: state, 
          context: context
        };
      }
      
    });
    
    sc = SC.Statechart.create({
      
      initialState: 'foo',
      
      delegate: del,
    
      foo: SC.State.design({
        
        info: {},
        
        location: 'foo/bar',
        
        createStateRouteHandlerContext: function(attr) {
          this.info.createStateRouteHandlerContext = {
            attr: attr
          };
          return sc_super();
        },
        
        handleTriggeredRoute: function(context) {
          this.info.handleTriggeredRoute = {
            context: context
          };
        }
        
      })
      
    });
    
    sc.initStatechart();
    foo = sc.getState('foo');
  },
  
  teardown: function() {
    sc = del = foo = null;
  }
  
});

test("invoke routeTriggered where delegate does allow state to handle route", function() {
  var info, context, params = { value: 'test' };
  
  foo.routeTriggered(params);

  info = foo.info.createStateRouteHandlerContext;

  ok(info, "state.createStateRouteHandlerContext should have been invoked");
  ok(info.attr, "state.createStateRouteHandlerContext should be provided attr param");
  
  info = foo.info.handleTriggeredRoute;
  
  ok(info, "state.handleTriggeredRoute should have been invoked");
  
  context = info.context;
  
  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state.handleTriggeredRoute should be provided a state route handler context object");
  equals(context.get('state'), foo, "context.state should be state foo");
  equals(context.get('location'), 'foo/bar', "context.location should be 'foo/bar'");
  equals(context.get('params'), params, "context.params should be value passed to state.routeTriggered method");
  equals(context.get('handler'), foo.routeTriggered, "context.handler should be reference to state.routeTriggered");
  
  info = del.info.statechartShouldStateHandleTriggeredRoute;
  
  ok(info, "del.statechartShouldStateHandleTriggeredRoute should have been invoked");
  equals(info.statechart, sc, "del.statechartShouldStateHandleTriggeredRoute should be provided a statechart");
  equals(info.state, foo, "del.statechartShouldStateHandleTriggeredRoute should be provided a state");
  
  context = info.context;
  
  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state.statechartShouldStateHandleTriggeredRoute should be provided a state route handler context object");
  equals(context.get('state'), foo, "context.state should be state foo");
  equals(context.get('location'), 'foo/bar', "context.location should be 'foo/bar'");
  equals(context.get('params'), params, "context.params should be value passed to state.routeTriggered method");
  equals(context.get('handler'), foo.routeTriggered, "context.handler should be reference to state.routeTriggered");
  
  info = del.info.statechartStateCancelledHandlingTriggeredRoute;
  
  ok(!info, "del.statechartStateCancelledHandlingTriggeredRoute should have been invoked");
});

test("invoke routeTriggered where delegate does not allow state to handle route", function() {
  var info, context, params = { value: 'test' };
  
  del.set('returnValue', NO);
  foo.routeTriggered(params);

  info = foo.info.createStateRouteHandlerContext;

  ok(info, "state.createStateRouteHandlerContext should have been invoked");
  ok(info.attr, "state.createStateRouteHandlerContext should be provided attr param");
  
  info = foo.info.handleTriggeredRoute;
  
  ok(!info, "state.handleTriggeredRoute should have been invoked");
  
  info = del.info.statechartShouldStateHandleTriggeredRoute;
  
  ok(info, "del.statechartShouldStateHandleTriggeredRoute should have been invoked");
  equals(info.statechart, sc, "del.statechartShouldStateHandleTriggeredRoute should be provided a statechart");
  equals(info.state, foo, "del.statechartShouldStateHandleTriggeredRoute should be provided a state");
  
  context = info.context;
  
  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state.statechartShouldStateHandleTriggeredRoute should be provided a state route handler context object");
  equals(context.get('state'), foo, "context.state should be state foo");
  equals(context.get('location'), 'foo/bar', "context.location should be 'foo/bar'");
  equals(context.get('params'), params, "context.params should be value passed to state.routeTriggered method");
  equals(context.get('handler'), foo.routeTriggered, "context.handler should be reference to state.routeTriggered");
  
  info = del.info.statechartStateCancelledHandlingTriggeredRoute;
  
  ok(info, "del.statechartStateCancelledHandlingTriggeredRoute should have been invoked");
  equals(info.statechart, sc, "del.statechartStateCancelledHandlingTriggeredRoute should be provided a statechart");
  equals(info.state, foo, "del.statechartStateCancelledHandlingTriggeredRoute should be provided a state");
  
  context = info.context;
  
  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state.statechartStateCancelledHandlingTriggeredRoute should be provided a state route handler context object");
  equals(context.get('state'), foo, "context.state should be state foo");
  equals(context.get('location'), 'foo/bar', "context.location should be 'foo/bar'");
  equals(context.get('params'), params, "context.params should be value passed to state.routeTriggered method");
  equals(context.get('handler'), foo.routeTriggered, "context.handler should be reference to state.routeTriggered");
  
});