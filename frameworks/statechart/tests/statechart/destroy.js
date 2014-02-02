// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC statechart State */

var obj, rootState, stateA, stateB;

module("SC.Statechart: Destroy Statechart Tests", {
  setup: function() {
    
    obj = SC.Object.create(SC.StatechartManager, {
      
      initialState: 'stateA',
      
      stateA: SC.State.design(),
      
      stateB: SC.State.design()
      
    });
    
    obj.initStatechart();
    rootState = obj.get('rootState');
    stateA = obj.getState('stateA');
    stateB = obj.getState('stateB');
  },
  
  teardown: function() {
    obj = rootState = stateA = stateB = null;
  }
});

test("check obj before and after destroy", function() {
  ok(!obj.get('isDestroyed'), "obj should not be destroyed");
  ok(obj.hasObserverFor('owner'), "obj should have observers for property owner");
  ok(obj.hasObserverFor('trace'), "obj should have observers for property trace");
  equals(obj.get('rootState'), rootState, "object should have a root state");
  
  ok(!rootState.get('isDestroyed'), "root state should not be destoryed");
  equals(rootState.getPath('substates.length'), 2, "root state should have two substates");
  equals(rootState.getPath('currentSubstates.length'), 1, "root state should one current substate");
  equals(rootState.get('historyState'), stateA, "root state should have history state of A");
  equals(rootState.get('initialSubstate'), stateA, "root state should have initial substate of A");
  equals(rootState.get('statechart'), obj, "root state's statechart should be obj");
  equals(rootState.get('owner'), obj, "root state's owner should be obj");
  
  ok(!stateA.get('isDestroyed'), "state A should not be destoryed");
  equals(stateA.get('parentState'), rootState, "state A should have a parent state of root state");
  
  ok(!stateB.get('isDestroyed'), "state B should not be destroyed");
  equals(stateB.get('parentState'), rootState, "state B should have a parent state of root state");
  
  obj.destroy();

  ok(obj.get('isDestroyed'), "obj should be destroyed");
  ok(!obj.hasObserverFor('owner'), "obj should not have observers for property owner");
  ok(!obj.hasObserverFor('trace'), "obj should not have observers for property trace");
  equals(obj.get('rootState'), null, "obj should not have a root state");
  
  ok(rootState.get('isDestroyed'), "root state should be destroyed");
  equals(rootState.get('substates'), null, "root state should not have substates");
  equals(rootState.get('currentSubstates'), null, "root state should not have current substates");
  equals(rootState.get('parentState'), null, "root state should not have a parent state");
  equals(rootState.get('historyState'), null, "root state should not have a history state");
  equals(rootState.get('initialSubstate'), null, "root state should not have an initial substate");
  equals(rootState.get('statechart'), null, "root state's statechart should be null");
  equals(rootState.get('owner'), null, "root state's owner should be null");
  
  ok(stateA.get('isDestroyed'), "state A should be destroyed");
  equals(stateA.get('parentState'), null, "state A should not have a parent state");
  
  ok(stateB.get('isDestroyed'), "state B should be destroyed");
  equals(stateB.get('parentState'), null, "state B should not have a parent state");
});