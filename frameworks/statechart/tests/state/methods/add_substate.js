// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var sc, root, stateA, stateB, stateX, stateY;

module("SC.State: addSubstate method Tests", {
  
  setup: function() {
    
    sc = SC.Statechart.create({
      
      trace: YES,
      
      initialState: 'a',
    
      a: SC.State.design(),
      
      b: SC.State.design({
        
        substatesAreConcurrent: YES,
        
        x: SC.State.design(),
        
        y: SC.State.design()
        
      })
      
    });
    
    sc.initStatechart();
    root = sc.get('rootState');
    stateA = sc.getState('a');
    stateB = sc.getState('b');
    stateX = sc.getState('x');
    stateY = sc.getState('y');
  },
  
  teardown: function() {
    sc = root = stateA = stateB = stateX = stateY = null;
  }
  
});

test("add a substate to the statechart's root state", function() {
  ok(!root.getSubstate('z'), "root state should not have a state z");
  
  var state = root.addSubstate('z');
  
  ok(SC.kindOf(state, SC.State) && state.isObject, "addState should return a state object");
  equals(root.getSubstate('z'), state, "root state should have a state z after adding state");
  ok(state.get('stateIsInitialized'), "state z should be initialized");
  ok(!state.get('isEnteredState'), "state z should not be entered");
  ok(!state.get('isCurrentState'), "state z should not be current");
  
  sc.gotoState('z');
  
  ok(state.get('isEnteredState'), "state z should be entered after transitioning to it");
  ok(state.get('isCurrentState'), "state z should be current after transitioning to it");
});

test("add a substate to state A", function() {
  ok(!stateA.getSubstate('z'), "state A should not have a state z");
  ok(!stateA.get('initialSubstate'), "state A should not have an initial substate");

  var state = stateA.addSubstate('z');
  
  ok(SC.kindOf(state, SC.State) && state.isObject, "addState should return a state object");
  equals(stateA.getSubstate('z'), state, "state A should have a state z after adding state");
  ok(SC.kindOf(stateA.get('initialSubstate'), SC.EmptyState), "state A's initial substate should be an empty state after adding state");
  ok(!state.get('isEnteredState'), "state z should not be entered");
  ok(!state.get('isCurrentState'), "state z should not be current");
  ok(stateA.get('isCurrentState'), "state A should be current");
  ok(stateA.get('isEnteredState'), "state A should be entered");
  
  console.log('reentering state A');
  stateA.set('initialSubstate', state);
  stateA.reenter();
  
  ok(state.get('isEnteredState'), "state z should be entered after reentering state A");
  ok(state.get('isCurrentState'), "state z should be current after reentering state A");
  ok(stateA.get('isEnteredState'), "state A should be entered after reentering");
  ok(!stateA.get('isCurrentState'), "state A should not be current after reentering");
});

test("add a substate to state B", function() {
  ok(!stateB.getSubstate('z'), "state B should not have a state z");
  sc.gotoState('b');

  var state = stateB.addSubstate('z');
  
  ok(SC.kindOf(state, SC.State) && state.isObject, "addState should return a state object");
  equals(stateB.getSubstate('z'), state, "state B should have a state z after adding state");
  ok(!state.get('isEnteredState'), "state z should not be entered");
  ok(!state.get('isCurrentState'), "state z should not be current");
  ok(!stateB.get('isCurrentState'), "state B should be current");
  ok(!stateB.get('initialSubstate'), "state B's initial substate should not be set");
  ok(stateB.get('isEnteredState'), "state B should be entered");
  equals(stateB.getPath('currentSubstates.length'), 2, "state B should have 2 current substates");
  
  stateB.reenter();
  
  ok(state.get('isEnteredState'), "state z should be entered after reentering state B");
  ok(state.get('isCurrentState'), "state z should be current after reentering state B");
  ok(stateB.get('isEnteredState'), "state B should be entered");
  equals(stateB.getPath('currentSubstates.length'), 3, "state B should have 3 current substates");
});