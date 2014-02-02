// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart, del, monitor, stateFoo, stateBar, stateA, stateB, stateC, stateX, stateY, TestState;

module("SC.Statechart: Concurrent States - Trigger Routing on States Basic Tests", {

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

    TestState = SC.State.extend({

      enterState: function(context) {
        this.info = {};
        this.info.enterState = {
          state: this,
          context: context
        };
      }

    });

    statechart = SC.Statechart.create({

      monitorIsActive: YES,

      delegate: del,

      statesAreConcurrent: YES,

      foo: SC.State.design({

        initialSubstate: 'a',

        a: TestState.design({

          representRoute: 'dog'

        }),

        b: TestState.design({

          representRoute: 'cat'

        }),

        c: TestState.design({

          representRoute: ''

        })

      }),

      bar: SC.State.design({

        initialSubstate: 'x',

        x: TestState.design({

          representRoute: 'pig'

        }),

        y: TestState.design({

          representRoute: 'cow',

          enterStateByRoute: function(context) {
            this.info = {};
            this.info.enterStateByRoute = {
              context: context
            };
          }

        })

      })

    });

    statechart.initStatechart();

    monitor = statechart.get('monitor');
    stateFoo = statechart.getState('foo');
    stateBar = statechart.getState('bar');
    stateA = statechart.getState('a');
    stateB = statechart.getState('b');
    stateC = statechart.getState('c');
    stateX = statechart.getState('x');
    stateY = statechart.getState('y');
  },

  teardown: function() {
    statechart = del = monitor = TestState = stateFoo = stateBar = stateA = stateB = stateC = stateX = stateY = null;
  }

});

test("check statechart initialization", function() {
  equals(del.get('location'), null, "del.location should be null");

  var handlers = del.handlers;

  ok(handlers['dog'], "delegate should have a route 'dog'");
  equals(handlers['dog'].statechart, statechart, "route 'dog' should be bound to statechart");
  equals(handlers['dog'].state, stateA, "route 'dog' should be bound to state A");
  equals(handlers['dog'].handler, stateA.routeTriggered, "route 'dog' should be bound to handler stateA.routeTriggered");

  ok(handlers['cat'], "delegate should have a route 'cat'");
  equals(handlers['cat'].statechart, statechart, "route 'cat' should be bound to statechart");
  equals(handlers['cat'].state, stateB, "route 'cat' should be bound to state B");
  equals(handlers['cat'].handler, stateB.routeTriggered, "route 'cat' should be bound to handler stateB.routeTriggered");

  ok(handlers[''], "delegate should have a route ''");
  equals(handlers[''].statechart, statechart, "route '' should be bound to statechart");
  equals(handlers[''].state, stateC, "route '' should be bound to state C");
  equals(handlers[''].handler, stateC.routeTriggered, "route '' should be bound to handler stateC.routeTriggered");

  ok(handlers['pig'], "delegate should have a route 'pig'");
  equals(handlers['pig'].statechart, statechart, "route 'pig' should be bound to statechart");
  equals(handlers['pig'].state, stateX, "route 'pig' should be bound to state X");
  equals(handlers['pig'].handler, stateX.routeTriggered, "route 'pig' should be bound to handler stateX.routeTriggered");

  ok(handlers['cow'], "delegate should have a route 'cow'");
  equals(handlers['cow'].statechart, statechart, "route 'cow' should be bound to statechart");
  equals(handlers['cow'].state, stateY, "route 'cow' should be bound to state Y");
  equals(handlers['cow'].handler, stateY.routeTriggered, "route 'cow' should be bound to handler stateY.routeTriggered");
});

test("trigger state B's route", function() {
  var params = {};

  monitor.reset();

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateB.get('isCurrentState'), "state B should not be a current state");
  ok(!stateC.get('isCurrentState'), "state C should not be a current state");
  ok(stateX.get('isCurrentState'), "state X should be a current state");
  ok(!stateY.get('isCurrentState'), "state Y should not be a current state");

  del.set('location', 'cat');

  stateB.routeTriggered(params);

  var seq = monitor.matchSequence().begin().exited('a').entered('b').end();
  ok(seq, 'sequence should be exited[a], entered[b]');

  ok(!stateA.get('isCurrentState'), "state A should not be a current state");
  ok(stateB.get('isCurrentState'), "state B should be a current state");
  ok(!stateC.get('isCurrentState'), "state C should not be a current state");
  ok(stateX.get('isCurrentState'), "state X should be a current state");
  ok(!stateY.get('isCurrentState'), "state Y should not be a current state");

  var info = stateB.info;

  ok(info.enterState, "state B's enterState should have been invoked");

  var context = info.enterState.context;

  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state B's enterState method should have been provided a state route handler context object");
  equals(context.get('state'), stateB);
  equals(context.get('location'), 'cat');
  equals(context.get('params'), params);
  equals(context.get('handler'), stateB.routeTriggered);
});

test("trigger state C's route", function() {
  var params = {};

  monitor.reset();

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateB.get('isCurrentState'), "state B should not be a current state");
  ok(!stateC.get('isCurrentState'), "state C should not be a current state");
  ok(stateX.get('isCurrentState'), "state X should be a current state");
  ok(!stateY.get('isCurrentState'), "state Y should not be a current state");

  del.set('location', '');

  stateC.routeTriggered(params);

  var seq = monitor.matchSequence().begin().exited('a').entered('c').end();
  ok(seq, 'sequence should be exited[a], entered[c]');

  ok(!stateA.get('isCurrentState'), "state A should not be a current state");
  ok(!stateB.get('isCurrentState'), "state B should not be a current state");
  ok(stateC.get('isCurrentState'), "state C should be a current state");
  ok(stateX.get('isCurrentState'), "state X should be a current state");
  ok(!stateY.get('isCurrentState'), "state Y should not be a current state");

  var info = stateC.info;

  ok(info.enterState, "state C's enterState should have been invoked");

  var context = info.enterState.context;

  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state C's enterState method should have been provided a state route handler context object");
  equals(context.get('state'), stateC);
  equals(context.get('location'), '');
  equals(context.get('params'), params);
  equals(context.get('handler'), stateC.routeTriggered);
});

test("trigger state Y's route", function() {
  var params = {};

  monitor.reset();

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateB.get('isCurrentState'), "state B should not be a current state");
  ok(!stateC.get('isCurrentState'), "state C should not be a current state");
  ok(stateX.get('isCurrentState'), "state X should be a current state");
  ok(!stateY.get('isCurrentState'), "state Y should not be a current state");

  del.set('location', 'cow');

  stateY.routeTriggered(params);

  var seq = monitor.matchSequence().begin().exited('x').entered('y').end();
  ok(seq, 'sequence should be exited[x], entered[y]');

  ok(stateA.get('isCurrentState'), "state A should be a current state");
  ok(!stateB.get('isCurrentState'), "state B should not be a current state");
  ok(!stateC.get('isCurrentState'), "state C should not be a current state");
  ok(!stateX.get('isCurrentState'), "state X should not be a current state");
  ok(stateY.get('isCurrentState'), "state Y should be a current state");

  var info = stateY.info;

  ok(!info.enterState, "state Y's enterState should not have been invoked");
  ok(info.enterStateByRoute, "state Y's enterStateByRoute should have been invoked");

  var context = info.enterStateByRoute.context;

  ok(SC.kindOf(context, SC.StateRouteHandlerContext), "state X's enterState method should have been provided a state route handler context object");
  equals(context.get('state'), stateY);
  equals(context.get('location'), 'cow');
  equals(context.get('params'), params);
  equals(context.get('handler'), stateX.routeTriggered);
});
