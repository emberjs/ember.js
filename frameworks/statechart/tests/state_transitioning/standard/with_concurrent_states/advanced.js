// ==========================================================================
// SC.State Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;
var monitor, root, stateA, stateB, stateC, stateD, stateE, stateF, stateG;
var stateH, stateI, stateJ, stateK, stateL, stateM, stateN, stateO, stateP;
var stateQ, stateR, stateS, stateZ;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: With Concurrent States - Goto State Advanced Tests", {
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
            
            f: SC.State.design({
              substatesAreConcurrent: YES,

              h: SC.State.design({
                initialSubstate: 'l',
                l: SC.State.design(),
                m: SC.State.design()
              }),
              
              i: SC.State.design({
                initialSubstate: 'n',
                n: SC.State.design(),
                o: SC.State.design()
              })
            }),
            
            g: SC.State.design({
              substatesAreConcurrent: YES,

              j: SC.State.design({
                initialSubstate: 'p',
                p: SC.State.design(),
                q: SC.State.design()
              }),
              
              k: SC.State.design({
                initialSubstate: 'r',
                r: SC.State.design(),
                s: SC.State.design()
              })
            })
          
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
    stateG = statechart.getState('g');
    stateH = statechart.getState('h');
    stateI = statechart.getState('i');
    stateJ = statechart.getState('j');
    stateK = statechart.getState('k');
    stateL = statechart.getState('l');
    stateM = statechart.getState('m');
    stateN = statechart.getState('n');
    stateO = statechart.getState('o');
    stateP = statechart.getState('p');
    stateQ = statechart.getState('q');
    stateR = statechart.getState('r');
    stateS = statechart.getState('s');
    stateZ = statechart.getState('z');
  },
  
  teardown: function() {
    statechart.destroy();
    monitor = root = stateA = stateB = stateC = stateD = stateE = stateF = stateG = null;
    stateH = stateI = stateJ = stateK = stateL = stateM = stateN = stateO = stateP = null;
    stateQ = stateR = stateS = stateZ = null;
  }
});

test("check statechart initialization", function() {
  equals(monitor.get('length'), 10, 'initial state sequence should be of length 10');
  equals(monitor.matchSequence().begin()
                                  .entered(root, 'a')
                                  .beginConcurrent()
                                    .beginSequence()
                                      .entered('b', 'd')
                                    .endSequence()
                                    .beginSequence()
                                      .entered('c', 'f')
                                      .beginConcurrent()
                                        .beginSequence()
                                          .entered('h', 'l')
                                        .endSequence()
                                        .beginSequence()
                                          .entered('i', 'n')
                                        .endSequence()
                                      .endConcurrent()
                                    .endSequence()
                                  .endConcurrent()
                                  .entered()
                                .end(), 
    true, 'initial sequence should be entered[ROOT, a, b, d, c, f, h, l, i, n]');
  
  equals(statechart.get('currentStateCount'), 3, 'current state count should be 3');
  equals(statechart.stateIsCurrentState('d'), true, 'current state should be d');
  equals(statechart.stateIsCurrentState('l'), true, 'current state should be l');
  equals(statechart.stateIsCurrentState('n'), true, 'current state should be n');
  
  equals(statechart.stateIsCurrentState('h'), false, 'current state should not be h');
  equals(statechart.stateIsCurrentState('i'), false, 'current state should not be i');
  equals(statechart.stateIsCurrentState('p'), false, 'current state should not be p');
  equals(statechart.stateIsCurrentState('q'), false, 'current state should not be q');
  equals(statechart.stateIsCurrentState('r'), false, 'current state should not be r');
  equals(statechart.stateIsCurrentState('s'), false, 'current state should not be s');
  
  equals(stateA.getPath('currentSubstates.length'), 3, 'state a should have 3 current substates');
  equals(stateA.stateIsCurrentSubstate('d'), true, 'state a\'s current substate should be state d');
  equals(stateA.stateIsCurrentSubstate('l'), true, 'state a\'s current substate should be state l');
  equals(stateA.stateIsCurrentSubstate('n'), true, 'state a\'s current substate should be state n');
  
  equals(stateC.getPath('currentSubstates.length'), 2, 'state a should have 2 current substates');
  equals(stateC.stateIsCurrentSubstate('l'), true, 'state c\'s current substate should be state l');
  equals(stateC.stateIsCurrentSubstate('n'), true, 'state c\'s current substate should be state n');
  
  equals(stateF.getPath('currentSubstates.length'), 2, 'state f should have 2 current substates');
  equals(stateF.stateIsCurrentSubstate('l'), true, 'state f\'s current substate should be state l');
  equals(stateF.stateIsCurrentSubstate('n'), true, 'state f\'s current substate should be state n');
  
  equals(stateG.getPath('currentSubstates.length'), 0, 'state g should have no current substates');  
  
  ok(monitor.matchEnteredStates(root, 'a', 'b', 'd', 'c', 'f', 'h', 'i', 'l', 'n'), 'states root, A, B, C, D, F, H, I, L and N should all be entered');
});

test("from state l, go to state g", function() {
  monitor.reset();
  stateL.gotoState('g');
  
  equals(monitor.get('length'), 10, 'initial state sequence should be of length 10');
  equals(monitor.matchSequence().begin()
                  .beginConcurrent()
                    .beginSequence()
                      .exited('l', 'h')
                    .endSequence()
                    .beginSequence()
                      .exited('n', 'i')
                    .endSequence()
                  .endConcurrent()
                  .exited('f')
                  .entered('g')
                  .beginConcurrent()
                    .beginSequence()
                      .entered('j', 'p')
                    .endSequence()
                    .beginSequence()
                      .entered('k', 'r')
                    .endSequence()
                  .endConcurrent()
                .end(), 
         true, 'initial sequence should be exited[l, h, n, i, f], entered[g, j, p, k, r]');
  
  equals(statechart.get('currentStateCount'), 3, 'current state count should be 3');
  equals(statechart.stateIsCurrentState('d'), true, 'current state should be d');
  equals(statechart.stateIsCurrentState('l'), false, 'current state should not be l');
  equals(statechart.stateIsCurrentState('n'), false, 'current state should not be n');
  equals(statechart.stateIsCurrentState('p'), true, 'current state should be p');
  equals(statechart.stateIsCurrentState('r'), true, 'current state should be r');
  
  equals(stateA.getPath('currentSubstates.length'), 3, 'state a should have 3 current substates');
  equals(stateA.stateIsCurrentSubstate('d'), true, 'state a\'s current substate should be state d');
  equals(stateA.stateIsCurrentSubstate('p'), true, 'state a\'s current substate should be state p');
  equals(stateA.stateIsCurrentSubstate('r'), true, 'state a\'s current substate should be state r');
  
  equals(stateC.getPath('currentSubstates.length'), 2, 'state a should have 2 current substates');
  equals(stateC.stateIsCurrentSubstate('p'), true, 'state c\'s current substate should be state p');
  equals(stateC.stateIsCurrentSubstate('r'), true, 'state c\'s current substate should be state r');
  
  equals(stateF.getPath('currentSubstates.length'), 0, 'state f should have no current substates');
  
  equals(stateG.getPath('currentSubstates.length'), 2, 'state g should have 2 current substates');
  equals(stateG.stateIsCurrentSubstate('p'), true, 'state g\'s current substate should be state p');
  equals(stateG.stateIsCurrentSubstate('r'), true, 'state g\'s current substate should be state r');
  
  ok(monitor.matchEnteredStates(root, 'a', 'b', 'd', 'c', 'g', 'j', 'k', 'p', 'r'), 'states root, A, B, C, D, G, J, K, P and R should all be entered');
});

test('from state l, go to state z', function() {
  monitor.reset();
  stateL.gotoState('z');
  
  equals(monitor.get('length'), 10, 'initial state sequence should be of length 10');
  equals(monitor.matchSequence()
                .begin()
                .exited('l', 'h', 'n', 'i', 'f', 'c', 'd', 'b', 'a')
                .entered('z')
                .end(), 
         true, 'sequence should be exited[l, h, n, i, f, c, d, b, a], entered[z]');
         
   equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
   equals(statechart.stateIsCurrentState('z'), true, 'current state should be z');
   equals(statechart.stateIsCurrentState('l'), false, 'current state should not be l');
   equals(statechart.stateIsCurrentState('n'), false, 'current state should not be n');
   equals(statechart.stateIsCurrentState('d'), false, 'current state should not be d');
   
   equals(stateA.getPath('currentSubstates.length'), 0, 'state a should have no current substates');
   equals(stateB.getPath('currentSubstates.length'), 0, 'state b should have no current substates');
   equals(stateC.getPath('currentSubstates.length'), 0, 'state c should have no current substates');
   equals(stateF.getPath('currentSubstates.length'), 0, 'state f should have no current substates');
   equals(stateG.getPath('currentSubstates.length'), 0, 'state g should have no current substates');
   
   ok(monitor.matchEnteredStates(root, 'z'), 'states root and Z should all be entered');
});

test('from state l, go to state z, and then go to state s', function() {
  stateL.gotoState('z');
  
  monitor.reset();
  stateZ.gotoState('s');
  
  equals(monitor.get('length'), 10, 'initial state sequence should be of length 10');
  equals(monitor.matchSequence()
                .begin()
                .exited('z')
                .entered('a', 'c', 'g', 'k', 's', 'j', 'p', 'b', 'd')
                .end(), 
         true, 'sequence should be exited[z], entered[a, c, g, k, s, j, p, b, d]');
         
   equals(statechart.get('currentStateCount'), 3, 'current state count should be 1');
   equals(statechart.stateIsCurrentState('z'), false, 'current state should not be z');
   equals(statechart.stateIsCurrentState('s'), true, 'current state should be s');
   equals(statechart.stateIsCurrentState('p'), true, 'current state should be p');
   equals(statechart.stateIsCurrentState('d'), true, 'current state should be d');
   
   equals(stateA.getPath('currentSubstates.length'), 3, 'state a should have 3 current substates');
   equals(stateB.getPath('currentSubstates.length'), 1, 'state b should have 1 current substates');
   equals(stateC.getPath('currentSubstates.length'), 2, 'state c should have 2 current substates');
   equals(stateF.getPath('currentSubstates.length'), 0, 'state f should have no current substates');
   equals(stateG.getPath('currentSubstates.length'), 2, 'state g should have 2 current substates');
   
   ok(monitor.matchEnteredStates(root, 'a', 'b', 'd', 'c', 'g', 'j', 'k', 'p', 's'), 'states root, A, B, C, D, G, J, K, P and S should all be entered');
});