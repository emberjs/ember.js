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

module("SC.Statechart: Supply Context Parameter gotoHistoryState - Without Concurrent States", {
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
      
      rootState: TestState.extend({
        
        initialSubstate: 'a',
        
        a: TestState.extend({
          initialSubstate: 'c',
          c: TestState.extend(),
          d: TestState.extend()
        }),
        
        b: TestState.extend({
          initialSubstate: 'e',
          e: TestState.extend(),
          f: TestState.extend()
        })
      })
      
    });
    
    statechart.initStatechart();
    
    statechart.gotoState('d');
    
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
  equals(stateD.get('enterStateContext'), null);
});

test("pass no context when going to state a's history state using statechart", function() {  
  statechart.gotoState('f');
  statechart.gotoHistoryState('a');
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), null);
  equals(stateA.get('enterStateContext'), null);
  equals(stateB.get('exitStateContext'), null);
  equals(stateF.get('exitStateContext'), null);
});

test("pass no context when going to state a's history state using state", function() {  
  stateD.gotoState('f');
  stateF.gotoHistoryState('a');
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), null);
  equals(stateA.get('enterStateContext'), null);
  equals(stateB.get('exitStateContext'), null);
  equals(stateF.get('exitStateContext'), null);
});

test("pass context when going to state a's history state using statechart - gotoHistoryState('f', context)", function() {  
  statechart.gotoState('f');
  statechart.gotoHistoryState('a', context);
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), context, 'state d should have context upon entering');
  equals(stateA.get('enterStateContext'), context, 'state a should have context upon entering');
  equals(stateB.get('exitStateContext'), context, 'state b should have context upon exiting');
  equals(stateF.get('exitStateContext'), context, 'state f should have context upon exiting');
});

test("pass context when going to state a's history state using state - gotoHistoryState('f', context)", function() {  
  statechart.gotoState('f');
  stateF.gotoHistoryState('a', context);
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), context, 'state d should have context upon entering');
  equals(stateA.get('enterStateContext'), context, 'state a should have context upon entering');
  equals(stateB.get('exitStateContext'), context, 'state b should have context upon exiting');
  equals(stateF.get('exitStateContext'), context, 'state f should have context upon exiting');
});

test("pass context when going to state a's history state using statechart - gotoHistoryState('f', stateF, context)", function() {  
  statechart.gotoState('f');
  statechart.gotoHistoryState('a', stateF, context);
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), context, 'state d should have context upon entering');
  equals(stateA.get('enterStateContext'), context, 'state a should have context upon entering');
  equals(stateB.get('exitStateContext'), context, 'state b should have context upon exiting');
  equals(stateF.get('exitStateContext'), context, 'state f should have context upon exiting');
});

test("pass context when going to state a's history state using statechart - gotoHistoryState('f', true, context)", function() {  
  statechart.gotoState('f');
  statechart.gotoHistoryState('a', true, context);
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), context, 'state d should have context upon entering');
  equals(stateA.get('enterStateContext'), context, 'state a should have context upon entering');
  equals(stateB.get('exitStateContext'), context, 'state b should have context upon exiting');
  equals(stateF.get('exitStateContext'), context, 'state f should have context upon exiting');
});

test("pass context when going to state a's history state using statechart - gotoHistoryState('f', stateF, true, context)", function() {  
  statechart.gotoState('f');
  statechart.gotoHistoryState('a', stateF, true, context);
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), context, 'state d should have context upon entering');
  equals(stateA.get('enterStateContext'), context, 'state a should have context upon entering');
  equals(stateB.get('exitStateContext'), context, 'state b should have context upon exiting');
  equals(stateF.get('exitStateContext'), context, 'state f should have context upon exiting');
});

test("pass context when going to state a's history state using state - gotoHistoryState('f', true, context)", function() {  
  statechart.gotoState('f');
  stateF.gotoHistoryState('a', true, context);
  equals(stateD.get('isCurrentState'), true);
  equals(stateD.get('enterStateContext'), context, 'state d should have context upon entering');
  equals(stateA.get('enterStateContext'), context, 'state a should have context upon entering');
  equals(stateB.get('exitStateContext'), context, 'state b should have context upon exiting');
  equals(stateF.get('exitStateContext'), context, 'state f should have context upon exiting');
});

// 
// test("pass context when going to state f using state - gotoState('f', context)", function() {  
//   stateC.gotoState('f', context);
//   equals(stateF.get('isCurrentState'), true);
//   equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
//   equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
//   equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
//   equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
// });
// 
// test("pass context when going to state f using statechart - gotoState('f', stateC, context) ", function() {  
//   statechart.gotoState('f', stateC, context);
//   equals(stateF.get('isCurrentState'), true);
//   equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
//   equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
//   equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
//   equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
// });
// 
// test("pass context when going to state f using statechart - gotoState('f', stateC, false, context) ", function() {  
//   statechart.gotoState('f', stateC, false, context);
//   equals(stateF.get('isCurrentState'), true);
//   equals(stateC.get('exitStateContext'), context, 'state c should have context upon exiting');
//   equals(stateA.get('exitStateContext'), context, 'state a should have context upon exiting');
//   equals(stateB.get('enterStateContext'), context, 'state b should have context upon entering');
//   equals(stateF.get('enterStateContext'), context, 'state f should have context upon entering');
// });