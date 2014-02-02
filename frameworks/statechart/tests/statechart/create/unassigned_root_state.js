// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC statechart State */

var obj1, rootState1, stateA, stateB;
var obj2, rootState2, stateC, stateD;
var obj3, rootState3, stateE, rootStateExample;
var obj4;
var owner;

module("SC.Statechart: Create Statechart with Unassigned Root State Tests", {
  setup: function() {
    owner = SC.Object.create();
    
    obj1 = SC.Object.extend(SC.StatechartManager, {
      
      initialState: 'stateA',
      
      stateA: SC.State.design({
        foo: function() {
          this.gotoState('stateB');
        }
      }),
      
      stateB: SC.State.design({
        bar: function() {
          this.gotoState('stateA');
        }
      })
      
    });
    
    obj1 = obj1.create();
    rootState1 = obj1.get('rootState');
    stateA = obj1.getState('stateA');
    stateB = obj1.getState('stateB');  
    
    obj2 = SC.Object.extend(SC.StatechartManager, {
      
      statesAreConcurrent: YES,
      
      stateC: SC.State.design({
        foo: function() {
          this.gotoState('stateD');
        }
      }),
      
      stateD: SC.State.design({
        bar: function() {
          this.gotoState('stateC');
        }
      })
      
    });
    
    obj2 = obj2.create();
    rootState2 = obj2.get('rootState');
    stateC = obj2.getState('stateC');
    stateD = obj2.getState('stateD');  
    
    rootStateExample = SC.State.extend({ test: 'foo' });
    
    obj3 = SC.Object.extend(SC.StatechartManager, {
      owner: owner,
      initialState: 'stateE',
      rootStateExample: rootStateExample,
      stateE: SC.State.design()
    });
    
    obj3 = obj3.create();
    rootState3 = obj3.get('rootState');
    stateE = obj3.getState('stateE');
    
    obj4 = SC.Object.extend(SC.StatechartManager, {
      autoInitStatechart: NO,
      initialState: 'stateF',
      rootStateExample: rootStateExample,
      stateF: SC.State.design()
    });
    
    obj4 = obj4.create();
  },
  
  teardown: function() {
    obj1 = rootState1 = stateA = stateB = null;
    obj2 = rootState2 = stateC = stateD = null;
    obj3 = rootState3 = stateE = rootStateExample = null;
    obj4 = null;
  }
});

test("check obj1 statechart", function() {
  ok(obj1.get('isStatechart'), "obj should be a statechart");
  ok(obj1.get('statechartIsInitialized'), "obj should be an initialized statechart");
  ok(SC.kindOf(rootState1, SC.State), "root state should be kind of SC.State");
  ok(!rootState1.get('substateAreConcurrent'), "root state's substates should not be concurrent");
  
  equals(obj1.get('initialState'), stateA, "obj's initialState should be state A");
  equals(rootState1.get('initialSubstate'), stateA, "root state's initialState should be state A");
  equals(stateA, rootState1.getSubstate('stateA'), "obj.stateA and rootState.stateA should be equal");
  equals(stateB, rootState1.getSubstate('stateB'), "obj.stateB and rootState.stateB should be equal");
  
  equals(rootState1.get('owner'), obj1, "root state's owner should be obj");
  equals(stateA.get('owner'), obj1, "state A's owner should be obj");
  equals(stateB.get('owner'), obj1, "state B's owner should be obj");
  
  ok(stateA.get('isCurrentState'), "state A should be current state");
  ok(!stateB.get('isCurrentState'), "state B should not be current state");
  
  obj1.sendEvent('foo');
  
  ok(!stateA.get('isCurrentState'), "state A should not be current state");
  ok(stateB.get('isCurrentState'), "state B should be current state");
});

test("check obj2 statechart", function() {
  ok(obj2.get('isStatechart'), "obj should be a statechart");
  ok(obj2.get('statechartIsInitialized'), "obj should be an initialized statechart");
  ok(SC.kindOf(rootState2, SC.State), "root state should be kind of SC.State");
  ok(rootState2.get('substatesAreConcurrent'), "root state's substates should be concurrent");
  
  equals(obj2.get('initialState'), null, "obj's initialState should be null");
  equals(rootState2.get('initialSubstate'), null, "root state's initialState should be null");
  equals(stateC, rootState2.getSubstate('stateC'), "obj.stateC and rootState.stateC should be equal");
  equals(stateD, rootState2.getSubstate('stateD'), "obj.stateD and rootState.stateD should be equal");
  
  equals(rootState2.get('owner'), obj2, "root state's owner should be obj");
  equals(stateC.get('owner'), obj2, "state C's owner should be obj");
  equals(stateD.get('owner'), obj2, "state D's owner should be obj");
  
  ok(stateC.get('isCurrentState'), "state C should be current state");
  ok(stateD.get('isCurrentState'), "state D should not be current state");
});

test("check obj3 statechart", function() {
  ok(obj3.get('isStatechart'), "obj should be a statechart");
  ok(obj3.get('statechartIsInitialized'), "obj should be an initialized statechart");
  ok(SC.kindOf(rootState3, rootStateExample), "root state should be kind of rootStateExample");
  ok(!rootState3.get('substatesAreConcurrent'), "root state's substates should be concurrent");
  
  equals(rootState3.get('owner'), owner, "root state's owner should be owner");
  equals(stateE.get('owner'), owner, "state C's owner should be owner");
  
  equals(obj3.get('initialState'), stateE, "obj's initialState should be stateE");
  equals(rootState3.get('initialSubstate'), stateE, "root state's initialState should be stateE");
  equals(stateE, rootState3.getSubstate('stateE'), "obj.stateE and rootState.stateE should be equal");
  
  ok(stateE.get('isCurrentState'), "state E should be current state");
});

test("check obj4 statechart", function() {
  ok(obj4.get('isStatechart'), "obj should be a statechart");
  ok(!obj4.get('statechartIsInitialized'), "obj should not be an initialized statechart");
  equals(obj4.get('rootState'), null, "obj's root state should be null");
  
  obj4.initStatechart();
  
  ok(obj4.get('statechartIsInitialized'), "obj should be an initialized statechart");
  ok(obj4.get('rootState'), "obj's root state should not be null");
  equals(obj4.get('rootState').getSubstate('stateF'), obj4.getState('stateF'), "obj.stateF should be equal to rootState.stateF");
});