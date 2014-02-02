// ==========================================================================
// SC.State Unit Test
// ==========================================================================
/*globals SC externalState1 externalState2 */

var statechart = null;
externalState1 = null;
externalState2 = null;

module("SC.State.plugin: Nest States Tests", {
  setup: function() {
    
    externalState1 = SC.State.extend({
      
      message: 'external state 1'
      
    });
    
    externalState2 = SC.State.extend({
      
      initialSubstate: 'd',
      
      message: 'external state 2',
      
      d: SC.State.design(),
      
      e: SC.State.plugin('externalState1')
      
    });
    
    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.plugin('externalState1'),
        
        b: SC.State.plugin('externalState2'),
        
        c: SC.State.design()
        
      })
      
    });
    
    statechart.initStatechart();
  },
  
  teardown: function() {
    statechart.destroy();
    externalState1 = null;
    externalState2 = null;
  }
});

test("check statechart states", function() {
  var stateA = statechart.getState('a'),
      stateB = statechart.getState('b'),
      stateC = statechart.getState('c'),
      stateD = statechart.getState('d'),
      stateE = statechart.getState('e');

  equals(SC.kindOf(stateA, externalState1), true, 'state a should be kind of externalState1');
  equals(SC.kindOf(stateB, externalState2), true, 'state b should be kind of externalState2');
  equals(SC.kindOf(stateE, externalState1), true, 'state e should be kind of externalState1');
  equals(SC.kindOf(stateC, externalState1), false, 'state c should not be kind of externalState1');
  equals(SC.kindOf(stateD, externalState1), false, 'state d should not be kind of externalState1');
  
  equals(stateA !== stateE, true, 'state a should not be equal to state e');
});

test("check statechart initialization", function() {
  var monitor = statechart.get('monitor');
  var root = statechart.get('rootState');
  
  equals(monitor.get('length'), 2, 'initial state sequence should be of length 2');
  equals(monitor.matchSequence().begin().entered(root, 'a').end(), true, 'initial sequence should be entered[ROOT, a]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('a'), true, 'current state should be a');
});

test("go to state e", function() {
  var monitor = statechart.get('monitor');
      
  monitor.reset();
  statechart.gotoState('e');
  
  equals(monitor.get('length'), 3, 'initial state sequence should be of length 3');
  equals(monitor.matchSequence().begin().exited('a').entered('b', 'e').end(), true, 'initial sequence should be exited[a], entered[b, e]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('e'), true, 'current state should be e');
});