// ==========================================================================
// SC.State Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;
var monitor, root, stateA, stateB, stateC, stateD, stateE, stateF, stateG, stateZ;

module("SC.Statechart: With Concurrent States - Goto State Intermediate Tests", {
  setup: function() {
    
    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',

        a: SC.State.design({
          substatesAreConcurrent: YES,
          
          b: SC.State.design({
            initialSubstate: 'd',
            d: SC.State.design(),
            e: SC.State.design()
          }),
          
          c: SC.State.design({
            initialSubstate: 'f',
            f: SC.State.design(),
            g: SC.State.design()
          })
        }),

        z: SC.State.design()
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
    stateZ = statechart.getState('z');
  },
  
  teardown: function() {
    statechart.destroy();
    statechart = monitor = root = null;
    stateA = stateB = stateC = stateD = stateE = stateF = stateG = stateZ = null;
  }
});

test("check statechart initialization", function() {  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 5');
  
  equals(monitor.matchSequence().begin()
                                  .entered(root, 'a')
                                  .beginConcurrent()
                                    .beginSequence()
                                      .entered('b', 'd')
                                    .endSequence()
                                    .beginSequence()
                                      .entered('c', 'f')
                                    .endSequence()
                                  .endConcurrent()
                                .end(), 
    true, 'initial sequence should be entered[ROOT, a, b, d, c, f]');
  
  equals(statechart.get('currentStateCount'), 2, 'current state count should be 2');
  equals(statechart.stateIsCurrentState('d'), true, 'current state should be d');
  equals(statechart.stateIsCurrentState('f'), true, 'current state should be f');
  equals(stateA.stateIsCurrentSubstate('d'), true, 'state a\'s current substate should be state d');
  equals(stateA.stateIsCurrentSubstate('f'), true, 'state a\'s current substate should be state f');
  equals(stateA.stateIsCurrentSubstate('e'), false, 'state a\'s current substate should not be state e');
  equals(stateA.stateIsCurrentSubstate('g'), false, 'state a\'s current substate should not be state g');
  equals(stateB.stateIsCurrentSubstate('d'), true, 'state b\'s current substate should be state d');
  equals(stateB.stateIsCurrentSubstate('e'), false, 'state b\'s current substate should not be state e');
  equals(stateC.stateIsCurrentSubstate('f'), true, 'state c\'s current substate should be state f');
  equals(stateC.stateIsCurrentSubstate('g'), false, 'state c\'s current substate should not be state g');
  
  ok(monitor.matchEnteredStates(root, 'a', 'b', 'c', 'd', 'f'), 'states root, A, B, C, D and F should all be entered');
});

test("from state d, go to state z", function() {   
  monitor.reset();
  stateD.gotoState('z');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('d', 'b', 'f', 'c', 'a').entered('z').end(), true, 'sequence should be exited[d, b, f, c, a], entered[z]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('z'), true, 'current state should be z');
  equals(stateA.getPath('currentSubstates.length'), 0, 'state a should have 0 current substates');
  equals(stateA.stateIsCurrentSubstate('d'), false, 'state a\'s current substate should not be state d');
  equals(stateA.stateIsCurrentSubstate('f'), false, 'state a\'s current substate should not be state f');
  equals(stateA.stateIsCurrentSubstate('e'), false, 'state a\'s current substate should not be state e');
  equals(stateA.stateIsCurrentSubstate('g'), false, 'state a\'s current substate should not be state g');
  
  ok(monitor.matchEnteredStates(root, 'z'), 'states root and Z should all be entered');
});

test("from state a, go to state z and then back to state a", function() { 
  monitor.reset();
  stateA.gotoState('z');

  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  
  equals(monitor.matchSequence().begin()
                                  .beginConcurrent()
                                    .beginSequence()
                                      .exited('d', 'b')
                                    .endSequence()
                                    .beginSequence()
                                      .exited('f', 'c')
                                    .endSequence()
                                  .endConcurrent()
                                  .exited('a')
                                  .entered('z')
                                .end(), 
    true, 'sequence should be exited[d, b, f, c, a], entered[z]');
  
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('z'), true, 'current state should be z');
  
  monitor.reset();
  stateZ.gotoState('a');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  
  equals(monitor.matchSequence().begin()
                                  .exited('z')
                                  .entered('a')
                                  .beginConcurrent()
                                    .beginSequence()
                                      .entered('b', 'd')
                                    .endSequence()
                                    .beginSequence()
                                      .entered('c', 'f')
                                    .endSequence()
                                  .endConcurrent()
                                .end(), 
    true, 'sequence should be exited[z], entered[a, b, d, c, f]');
  
  equals(statechart.get('currentStateCount'), 2, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('d'), true, 'current state should be d');
  equals(statechart.stateIsCurrentState('f'), true, 'current state should be f');
  equals(stateA.getPath('currentSubstates.length'), 2, 'state a should have 2 current substates');
  equals(stateA.stateIsCurrentSubstate('d'), true, 'state a\'s current substate should be state d');
  equals(stateA.stateIsCurrentSubstate('e'), false, 'state a\'s current substate should not be state e');
  equals(stateA.stateIsCurrentSubstate('f'), true, 'state a\'s current substate should be state f');
  equals(stateA.stateIsCurrentSubstate('g'), false, 'state a\'s current substate should not be state g');
  
  ok(monitor.matchEnteredStates(root, 'a', 'b', 'c', 'd', 'f'), 'states root, A, B, C, D and F should all be entered');
});