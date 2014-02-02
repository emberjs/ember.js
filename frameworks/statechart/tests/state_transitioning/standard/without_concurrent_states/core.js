// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;
var root, stateA, stateB, stateC, stateD, stateE, stateF, stateG, stateH; 
var stateI, stateJ, stateK, stateL, stateM, stateN, monitor;
var allState;

module("SC.Statechart: No Concurrent States - Goto State Tests", {
  setup: function() {

    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
        
          initialSubstate: 'c',
          
          c: SC.State.design({
            initialSubstate: 'g',
            g: SC.State.design(),
            h: SC.State.design()
          }),
          
          d: SC.State.design({
            initialSubstate: 'i',
            i: SC.State.design(),
            j: SC.State.design()
          })
          
        }),
        
        b: SC.State.design({
          
          initialSubstate: 'e',
          
          e: SC.State.design({
            initialSubstate: 'k',
            k: SC.State.design(),
            l: SC.State.design()
          }),
          
          f: SC.State.design({
            initialSubstate: 'm',
            m: SC.State.design(),
            n: SC.State.design()
          })
          
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
    stateG = statechart.getState('g');
    stateH = statechart.getState('h');
    stateI = statechart.getState('i');
    stateJ = statechart.getState('j');
    stateK = statechart.getState('k');
    stateL = statechart.getState('l');
    stateM = statechart.getState('m');
    stateN = statechart.getState('n');
  },
  
  teardown: function() {
    statechart.destroy();
    statechart = monitor = root = null;
    stateA = stateB = stateC = stateD = stateE = stateF = stateG = stateH = stateI = stateJ = null;
    stateK = stateL = stateM = stateN = null;
  }
});

test("check statechart state objects", function() {
  equals(SC.none(stateG), false, 'statechart should return a state object for state with name "g"');
  equals(stateG.get('name'), 'g', 'state g should have name "g"');
  equals(stateG.get('isCurrentState'), true, 'state G should be current state');
  equals(stateG.stateIsCurrentSubstate('g'), true, 'state g should have current substate g');
  equals(statechart.stateIsCurrentState('g'), true, 'statechart should have current state g');
  equals(statechart.stateIsCurrentState(stateG), true, 'statechart should have current state g');
  
  equals(SC.none(stateM), false, 'statechart should return a state object for state with name "m"');
  equals(stateM.get('name'), 'm', 'state m should have name "m"');
  equals(stateM.get('isCurrentState'), false, 'state m should not be current state');
  equals(stateG.stateIsCurrentSubstate('m'), false, 'state m should not have current substate m');
  equals(statechart.stateIsCurrentState('m'), false, 'statechart should not have current state m');
  equals(statechart.stateIsCurrentState(stateM), false, 'statechart should not have current state m');
  
  equals(SC.none(stateA), false, 'statechart should return a state object for state with name "a"');
  equals(stateA.get('isCurrentState'), false, 'state m should not be current state');
  equals(stateA.stateIsCurrentSubstate('a'), false, 'state a should not have current substate g');
  equals(stateA.stateIsCurrentSubstate('c'), false, 'state a should not have current substate c');
  equals(stateA.stateIsCurrentSubstate('g'), true, 'state a should have current substate g');
  equals(stateA.stateIsCurrentSubstate(stateG), true, 'state a should have current substate g');
  equals(stateA.stateIsCurrentSubstate(stateM), false, 'state a should not have current substate m');
  
  var stateX = statechart.getState('x');
  equals(SC.none(stateX), true, 'statechart should not have a state with name "x"');
});

test("check statechart initialization", function() {
  equals(monitor.get('length'), 4, 'initial state sequence should be of length 4');
  equals(monitor.matchSequence().begin().entered(root, 'a', 'c', 'g').end(), true, 'initial sequence should be entered[ROOT, a, c, g]');
  equals(monitor.matchSequence().begin().entered(root, 'a', 'c', 'h').end(), false, 'initial sequence should not be entered[ROOT, a, c, h]');
  
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('g'), true, 'current state should be g');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'g'), 'states root, A, C and G should all be entered');
});

test("go to state h", function() {
  monitor.reset();
  statechart.gotoState('h');
  
  equals(monitor.get('length'), 2, 'state sequence should be of length 2');
  equals(monitor.matchSequence().begin().exited('g').entered('h').end(), true, 'sequence should be exited[g], entered[h]');
  equals(monitor.matchSequence().begin().exited('h').entered('g').end(), false, 'sequence should not be exited[h], entered[g]');
  
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('h'), true, 'current state should be h');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'h'), 'states root, A, C and H should all be entered');
});

test("go to states: h, d", function() {
  statechart.gotoState('h');
  
  monitor.reset();
  statechart.gotoState('d');
  
  equals(monitor.get('length'), 4, 'state sequence should be of length 4');
  equals(monitor.matchSequence().begin().exited('h', 'c').entered('d', 'i').end(), true, 'sequence should be exited[h, c], entered[d, i]');
  equals(monitor.matchSequence().begin().exited('h', 'c').entered('d', 'f').end(), false, 'sequence should not be exited[h, c], entered[d, f]');
  equals(monitor.matchSequence().begin().exited('g', 'c').entered('d', 'i').end(), false, 'sequence should not be exited[g, c], entered[d, f]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('i'), true, 'current state should be i');
  
  ok(monitor.matchEnteredStates(root, 'a', 'd', 'i'), 'states root, A, D and I should all be entered');
});

test("go to states: h, d, h", function() {
  statechart.gotoState('h');
  statechart.gotoState('d');
  
  monitor.reset();
  statechart.gotoState('h');
  
  equals(monitor.get('length'), 4, 'state sequence should be of length 4');
  equals(monitor.matchSequence().begin().exited('i', 'd').entered('c', 'h').end(), true, 'sequence should be exited[i, d], entered[c, h]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('h'), true, 'current state should be h');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'h'), 'states root, A, C and H should all be entered');
});

test("go to state b", function() {
  monitor.reset();
  statechart.gotoState('b');
  
  equals(monitor.get('length'), 6, 'state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'e', 'k').end(), true, 'sequence should be exited[g, c, a], entered[b, e, k]');
  equals(monitor.matchSequence().begin().exited('g', 'a', 'c').entered('b', 'e', 'k').end(), false, 'sequence should not be exited[g, a, c], entered[b, e, k]');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'k', 'e').end(), false, 'sequence should not be exited[g, c, a], entered[b, k, e]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('k'), true, 'current state should be k');
  
  ok(monitor.matchEnteredStates(root, 'b', 'e', 'k'), 'states root, B, E and K should all be entered');
});

test("go to state f", function() {
  monitor.reset();
  statechart.gotoState('f');
  
  equals(monitor.get('length'), 6, 'state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'f', 'm').end(), true, 'sequence should be exited[g, c, a], entered[b, f, m]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('m'), true, 'current state should be m');
  
  ok(monitor.matchEnteredStates(root, 'b', 'f', 'm'), 'states root, B, F and M should all be entered');
});

test("go to state n", function() {
  monitor.reset();
  statechart.gotoState('n');
  
  equals(monitor.get('length'), 6, 'state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'f', 'n').end(), true, 'sequence should be exited[g, c, a], entered[b, f, n]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('n'), true, 'current state should be n');
  
  ok(monitor.matchEnteredStates(root, 'b', 'f', 'n'), 'states root, B, F and N should all be entered');
});

test("re-enter state g", function() {
  monitor.reset();
  statechart.gotoState('g');
  
  equals(monitor.get('length'), 2, 'state sequence should be of length 2');
  equals(monitor.matchSequence().begin().exited('g').entered('g').end(), true, 'sequence should be exited[g], entered[g]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('g'), true, 'current state should be g');
  
  monitor.reset();
  equals(monitor.get('length'), 0, 'state sequence should be of length 0 after monitor reset');
  
  var state = statechart.getState('g');
  state.reenter();
  
  equals(monitor.get('length'), 2, 'state sequence should be of length 2');
  equals(monitor.matchSequence().begin().exited('g').entered('g').end(), true, 'sequence should be exited[g], entered[g]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('g'), true, 'current state should be g');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'g'), 'states root, A, C and G should all be entered');
}); 

test("go to g state's ancestor state a", function() {
  monitor.reset();
  statechart.gotoState('a');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('a', 'c', 'g').end(), true, 'sequence should be exited[g, c, a], entered[a, c, g]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('g'), true, 'current state should be g');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'g'), 'states root, A, C and G should all be entered');
});

test("go to state b and then go to root state", function() {
  statechart.gotoState('b');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('k'), true, 'current state should be k');
  
  monitor.reset();
  statechart.gotoState(statechart.get('rootState'));
  
  var root = statechart.get('rootState');
  equals(monitor.get('length'), 8, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('k', 'e', 'b', root).entered(root, 'a', 'c', 'g').end(), 
        true, 'sequence should be exited[k, e, b, ROOT], entered[ROOT, a, c, g]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('g'), true, 'current state should be g');
  
  ok(monitor.matchEnteredStates(root, 'a', 'c', 'g'), 'states root, A, C and G should all be entered');
});

test("from state g, go to state m calling state g\'s gotoState", function() {
  equals(stateG.get('isCurrentState'), true, 'state g should be current state');
  equals(stateM.get('isCurrentState'), false, 'state m should not be current state');
  
  monitor.reset();
  stateG.gotoState('m');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'f', 'm').end(), 
        true, 'sequence should be exited[g, c, a], entered[b, f, m]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('m'), true, 'current state should be m');
  
  equals(stateG.get('isCurrentState'), false, 'state g should not be current state');
  equals(stateM.get('isCurrentState'), true, 'state m should be current state');
  
  ok(monitor.matchEnteredStates(root, 'b', 'f', 'm'), 'states root, B, F and M should all be entered');
});

test("from state g, go to state h using 'parentState' syntax", function() {
  monitor.reset();
  stateG.gotoState('h');
  
  equals(monitor.matchSequence().begin().exited('g').entered('h').end(), 
    true, 'sequence should be exited[g], entered[h]');
});