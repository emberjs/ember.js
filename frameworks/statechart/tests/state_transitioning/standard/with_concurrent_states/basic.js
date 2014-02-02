// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;
var monitor, root, stateA, stateB, stateC, stateD, stateE, stateF;

module("SC.Statechart: With Concurrent States - Goto State Basic Tests", {
  setup: function() {
    
    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        substatesAreConcurrent: YES,

        a: SC.State.design({
          initialSubstate: 'c',
          c: SC.State.design(),
          d: SC.State.design()
        }),

        b: SC.State.design({
          initialSubstate: 'e',
          e: SC.State.design(),
          f: SC.State.design()
        })
      })
      
    });
    
    statechart.initStatechart();
    
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
    statechart.destroy();
    statechart = monitor = root = stateA = stateB = stateC = stateD = stateE = stateF = null;
  }
});

test("check statechart initialization", function() {
  equals(monitor.get('length'), 5, 'initial state sequence should be of length 5');
  equals(monitor.matchSequence().begin()
                                  .entered(root)
                                  .beginConcurrent()
                                    .beginSequence()
                                      .entered('a', 'c')
                                    .endSequence()
                                    .beginSequence()
                                      .entered('b', 'e')
                                    .endSequence()
                                  .endConcurrent()
                                .end(), 
    true, 'initial sequence should be entered[ROOT, a, c, b, e]');
  equals(monitor.matchSequence().begin()
                                  .entered(root)
                                  .beginConcurrent()
                                    .entered('a', 'b')
                                  .endConcurrent()
                                  .beginConcurrent()
                                    .entered('c', 'e')
                                  .endConcurrent()
                                .end(), 
    false, 'initial sequence should not be entered[ROOT, a, b, c, e]');
  
  equals(statechart.get('currentStateCount'), 2, 'current state count should be 2');
  
  equals(statechart.stateIsCurrentState('c'), true, 'current state should be c');
  equals(statechart.stateIsCurrentState('e'), true, 'current state should be e');
  equals(statechart.stateIsCurrentState('d'), false, 'current state should not be d');
  equals(statechart.stateIsCurrentState('f'), false, 'current state should not be f');
  
  equals(stateA.stateIsCurrentSubstate('c'), true, 'state a\'s current substate should be state c');
  equals(stateA.stateIsCurrentSubstate('d'), false, 'state a\'s current substate should not be state d');
  equals(stateB.stateIsCurrentSubstate('e'), true, 'state a\'s current substate should be state e');
  equals(stateB.stateIsCurrentSubstate('f'), false, 'state a\'s current substate should not be state f');
  
  equals(stateA.get('isCurrentState'), false, 'state a should not be current state');
  equals(stateB.get('isCurrentState'), false, 'state b should not be current state');
  equals(stateC.get('isCurrentState'), true, 'state c should be current state');
  equals(stateD.get('isCurrentState'), false, 'state d should not be current state');
  equals(stateE.get('isCurrentState'), true, 'state e should be current state');
  equals(stateF.get('isCurrentState'), false, 'state f should not be current state');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'b', 'e'), 'states root, A, C, B and E should all be entered');
});

test("from state c, go to state d, and from state e, go to state f", function() {
  monitor.reset();
  
  stateC.gotoState('d');
  equals(monitor.get('length'), 2, 'state sequence should be of length 2');
  equals(monitor.matchSequence().begin().exited('c').entered('d').end(), true, 'sequence should be exited[c], enterd[d]');
  
  monitor.reset();
  
  stateE.gotoState('f');
  equals(monitor.get('length'), 2, 'state sequence should be of length 2');
  equals(monitor.matchSequence().begin().exited('e').entered('f').end(), true, 'sequence should be exited[e], enterd[f]');
  
  equals(statechart.get('currentStateCount'), 2, 'current state count should be 2');
  
  equals(statechart.stateIsCurrentState('d'), true, 'current state should be d');
  equals(statechart.stateIsCurrentState('f'), true, 'current state should be f');
  
  equals(stateA.stateIsCurrentSubstate('c'), false, 'state a\'s current substate should not be state c');
  equals(stateA.stateIsCurrentSubstate('d'), true, 'state a\'s current substate should be state d');
  equals(stateB.stateIsCurrentSubstate('e'), false, 'state b\'s current substate should not be state e');
  equals(stateB.stateIsCurrentSubstate('f'), true, 'state b\'s current substate should be state f');
  
  equals(stateA.get('isCurrentState'), false, 'state a should not be current state');
  equals(stateB.get('isCurrentState'), false, 'state b should not be current state');
  equals(stateC.get('isCurrentState'), false, 'state c should not be current state');
  equals(stateD.get('isCurrentState'), true, 'state d should be current state');
  equals(stateE.get('isCurrentState'), false, 'state e should not be current state');
  equals(stateF.get('isCurrentState'), true, 'state f should be current state');
  
  ok(monitor.matchEnteredStates(root, 'a', 'd', 'b', 'f'), 'states root, A, D, B and F should all be entered');
});

test("from state a, go to sibling concurrent state b", function() {
  monitor.reset();
  
  // Expect to get an error to be outputted in the JS console, which is what we want since
  // the pivot state is the root state and it's substates are concurrent
  console.log('expecting to get an error...');
  stateA.gotoState('b');
  
  equals(monitor.get('length'), 0, 'state sequence should be of length 0');
  equals(statechart.get('currentStateCount'), 2, 'current state count should be 2');
  equals(statechart.stateIsCurrentState('c'), true, 'current state should be c');
  equals(statechart.stateIsCurrentState('e'), true, 'current state should be e');
  equals(stateA.stateIsCurrentSubstate('c'), true, 'state a\'s current substate should be state c');
  equals(stateA.stateIsCurrentSubstate('d'), false, 'state a\'s current substate should not be state d');
  equals(stateB.stateIsCurrentSubstate('e'), true, 'state a\'s current substate should be state e');
  equals(stateB.stateIsCurrentSubstate('f'), false, 'state a\'s current substate should not be state f');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'b', 'e'), 'states root, A, C, B and E should all be entered');
});