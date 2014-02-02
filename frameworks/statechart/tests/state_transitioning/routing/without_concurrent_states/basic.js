// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart, del, monitor, stateA, stateB, stateC, stateD;

module("SC.Statechart: No Concurrent States - Trigger Routing on States Basic Tests", {
  setup: function() {

    del = SC.Object.create(SC.StatechartDelegate, {

      location: null,

      handlers: {},

      statechartUpdateLocationForState: function(statechart, location, state) {
        this.set('location', location);
      },

      statechartAcquireLocationForState: function(statechart, state) {
        return this.get('location');
      },

      statechartBindStateToRoute: function(statechart, state, route, handler) {
        this.handlers[route] = {
          statechart: statechart,
          state: state,
          handler: handler
        };
      }

    });

    statechart = SC.Statechart.create({

      monitorIsActive: YES,

      delegate: del,

      initialState: 'a',

      a: SC.State.design({

        representRoute: 'foo',

        info: {},

        enterState: function(context) {
          this.info.enterState = {
            context: context
          };
        }

      }),

      b: SC.State.design({

        representRoute: 'bar',

        info: {},

        enterState: function(context) {
          this.info.enterState = {
            context: context
          };
        }

      }),

      c: SC.State.design({

        representRoute: 'mah',

        info: {},

        enterStateByRoute: function(context) {
          this.info.enterStateByRoute = {
            context: context
          };
        },

        enterState: function(context) {
          this.info.enterState = {
            context: context
          };
        }

      }),

      d: SC.State.design({

        representRoute: '',

        info: {},

        enterStateByRoute: function(context) {
          this.info.enterStateByRoute = {
            context: context
          };
        },

        enterState: function(context) {
          this.info.enterState = {
            context: context
          };
        }

      })

    });

    statechart.initStatechart();

    monitor = statechart.get('monitor');
    stateA = statechart.getState('a');
    stateB = statechart.getState('b');
    stateC = statechart.getState('c');
    stateD = statechart.getState('d');
  },

  teardown: function() {
    statechart = del = monitor = stateA = stateB = stateC = stateD = null;
  }

});

test("check statechart initialization", function() {
  equals(del.get('location'), null, "del.location should be null");

  var handlers = del.handlers;

  ok(handlers['foo'], "delegate should have a route 'foo'");
  equals(handlers['foo'].statechart, statechart, "route 'foo' should be bound to statechart");
  equals(handlers['foo'].state, stateA, "route 'foo' should be bound to state A");
  equals(handlers['foo'].handler, stateA.routeTriggered, "route 'foo' should be bound to handler stateA.routeTriggered");

  ok(handlers['bar'], "delegate should have a route 'bar'");
  equals(handlers['bar'].statechart, statechart, "route 'bar' should be bound to statechart");
  equals(handlers['bar'].state, stateB, "route 'bar' should be bound to state B");
  equals(handlers['bar'].handler, stateB.routeTriggered, "route 'bar' should be bound to handler stateB.routeTriggered");

  ok(handlers['mah'], "delegate should have a route 'mah'");
  equals(handlers['mah'].statechart, statechart, "route 'mah' should be bound to statechart");
  equals(handlers['mah'].state, stateC, "route 'mah' should be bound to state C");
  equals(handlers['mah'].handler, stateC.routeTriggered, "route 'mah' should be bound to handler stateC.routeTriggered");

  ok(handlers[''], "delegate should have a route ''");
  equals(handlers[''].statechart, statechart, "route '' should be bound to statechart");
  equals(handlers[''].state, stateD, "route '' should be bound to state D");
  equals(handlers[''].handler, stateD.routeTriggered, "route '' should be bound to handler stateD.routeTriggered");
});

test("trigger state B's route", function() {
  var params = {};

  monitor.reset();

  del.set('location', 'bar');

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateB.get('isCurrentState'), "state B should not be a current state");

  stateB.routeTriggered(params);

  var seq = monitor.matchSequence().begin().exited('a').entered('b').end();
  ok(seq, 'sequence should be exited[a], entered[b]');

  ok(!stateA.get('isCurrentState'), "state A should not be a current state after route triggered");
  ok(stateB.get('isCurrentState'), "state B should be a current state after route triggered");

  var info = stateB.info;

  ok(info.enterState, "state B's enterState should have been invoked");

  var context = info.enterState.context;

  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state B's enterState method should have been provided a state route handler context object");
  equals(context.get('state'), stateB);
  equals(context.get('location'), 'bar');
  equals(context.get('params'), params);
  equals(context.get('handler'), stateB.routeTriggered);
});

test("trigger state C's route", function() {
  var params = {};

  monitor.reset();

  del.set('location', 'mah');

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateC.get('isCurrentState'), "state C should not be a current state");

  stateC.routeTriggered(params);

  var seq = monitor.matchSequence().begin().exited('a').entered('c').end();
  ok(seq, 'sequence should be exited[a], entered[c]');

  ok(!stateA.get('isCurrentState'), "state A should not be a current state after route triggered");
  ok(stateC.get('isCurrentState'), "state C should be a current state after route triggered");

  var info = stateC.info;

  ok(!info.enterState, "state C's enterState should not have been invoked");
  ok(info.enterStateByRoute, "state C's enterStateByRoute should have been invoked");

  var context = info.enterStateByRoute.context;

  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state C's enterState method should have been provided a state route handler context object");
  equals(context.get('state'), stateC);
  equals(context.get('location'), 'mah');
  equals(context.get('params'), params);
  equals(context.get('handler'), stateC.routeTriggered);
});

test("trigger state D's route", function() {
  var params = {};

  monitor.reset();

  del.set('location', '');

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateD.get('isCurrentState'), "state D should not be a current state");

  stateD.routeTriggered(params);

  var seq = monitor.matchSequence().begin().exited('a').entered('d').end();
  ok(seq, 'sequence should be exited[a], entered[d]');

  ok(!stateA.get('isCurrentState'), "state A should not be a current state after route triggered");
  ok(stateD.get('isCurrentState'), "state D should be a current state after route triggered");

  var info = stateD.info;

  ok(!info.enterState, "state D's enterState should not have been invoked");
  ok(info.enterStateByRoute, "state D's enterStateByRoute should have been invoked");

  var context = info.enterStateByRoute.context;

  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state D's enterState method should have been provided a state route handler context object");
  equals(context.get('state'), stateD);
  equals(context.get('location'), '');
  equals(context.get('params'), params);
  equals(context.get('handler'), stateD.routeTriggered);
});

test("Go to state C without triggering state's route", function() {
  var context = {};

  monitor.reset();

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateC.get('isCurrentState'), "state C should not be a current state");

  statechart.gotoState(stateC, context);

  var seq = monitor.matchSequence().begin().exited('a').entered('c').end();
  ok(seq, 'sequence should be exited[a], entered[c]');

  ok(!stateA.get('isCurrentState'), "state A should not be a current state after route triggered");
  ok(stateC.get('isCurrentState'), "state C should be a current state after route triggered");

  var info = stateC.info;

  ok(info.enterState, "state C's enterState should have been invoked");
  ok(!info.enterStateByRoute, "state C's enterStateByRoute should not have been invoked");
  equals(info.enterState.context, context, "state C's enterState should have been passed a context value");
});

test("Go to state D without triggering state's route", function() {
  var context = {};

  monitor.reset();

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateD.get('isCurrentState'), "state D should not be a current state");

  statechart.gotoState(stateD, context);

  var seq = monitor.matchSequence().begin().exited('a').entered('d').end();
  ok(seq, 'sequence should be exited[a], entered[d]');

  ok(!stateA.get('isCurrentState'), "state A should not be a current state after route triggered");
  ok(stateD.get('isCurrentState'), "state D should be a current state after route triggered");

  var info = stateD.info;

  ok(info.enterState, "state D's enterState should have been invoked");
  ok(!info.enterStateByRoute, "state D's enterStateByRoute should not have been invoked");
  equals(info.enterState.context, context, "state D's enterState should have been passed a context value");
});
