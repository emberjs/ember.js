// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var statechart,
    TestState,
    context,
    monitor,
    root,
    stateA,
    stateB,
    stateC,
    stateD,
    stateE,
    stateF;

module("SC.Statechart: Supply Context Parameter to gotoState - Without Concurrent States", {
  setup: function() {
    
    TestState = SC.State.extend({
      enterStateContext: null,
      exitStateContext: null,
      
      enterState: function(context) {
        this.set('enterStateContext', context);
      },
      
      exitState: function(context) {
        this.set('exitStateContext', context);
      }
    });
    
    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: TestState.design({
        
        initialSubstate: 'a',
        
        a: TestState.design({
          initialSubstate: 'c',
          c: TestState.design(),
          d: TestState.design()
        }),
        
        b: TestState.design({
          initialSubstate: 'e',
          e: TestState.design(),
          f: TestState.design()
        })
      })
      
    });
    
    statechart.initStatechart();
    
    context = { foo: 100 };
    
    monitor = statechart.get('monitor');
    root = statechart.get('rootState');
    stateA = statechart.getState('a');
    stateB = statechart.getState('b');
    stateC = statechart.getState('c');
    stateD = statechart.getState('d');
    stateE = statechart.getState('e');
    stateF = statechart.getState('f');
  },
  
  teardown: function() {
    statechart = TestState = monitor = context = null;
    root = stateA = stateB = stateC = stateD = stateE = stateF;
  }
});

test("check statechart initialization", function() {
  equals(root.get('enterStateContext'), null);
  equals(stateA.get('enterStateContext'), null);
  equals(stateC.get('enterStateContext'), null);
});

test("pass no context when going to state f using statechart", function() {  
  statechart.gotoState('f');
  equals(stateF.get('isCurrentState'), true);
  equals(stateC.get('exitStateContext'), null);
  equals(stateA.get('exitStateContext'), null);
  equals(stateB.get('enterStateContext'), null);
  equals(stateF.get('enterStateContext'), null);
});

test("pass no context when going to state f using state", function() {  
  stateC.gotoState('f');
  equals(stateF.get('isCurrentState'), true);
  equals(stateC.get('exitStateContext'), null);
  equals(stateA.get('exitStateContext'), null);
  equals(stateB.get('enterStateContext'), null);
  equals(stateF.get('enterStateContext'), null);
});

test("pass context when going to state f using statechart - gotoState('f', context)", function() {  
  statechart.gotoState('f', context);
  equals(stateF.get('isCurrentState'), true);
  equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
  equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
  equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
  equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
});

test("pass context when going to state f using state - gotoState('f', context)", function() {  
  stateC.gotoState('f', context);
  equals(stateF.get('isCurrentState'), true);
  equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
  equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
  equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
  equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
});

test("pass context when going to state f using statechart - gotoState('f', stateC, context) ", function() {  
  statechart.gotoState('f', stateC, context);
  equals(stateF.get('isCurrentState'), true);
  equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
  equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
  equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
  equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
});

test("pass context when going to state f using statechart - gotoState('f', false, context) ", function() {  
  statechart.gotoState('f', false, context);
  equals(stateF.get('isCurrentState'), true);
  equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
  equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
  equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
  equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
});

test("pass context when going to state f using statechart - gotoState('f', stateC, false, context) ", function() {  
  statechart.gotoState('f', stateC, false, context);
  equals(stateF.get('isCurrentState'), true);
  equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
  equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
  equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
  equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
});