// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC statechart */

var obj1, rootState1, stateA, stateB;
var obj2;

module("SC.Statechart: Create Statechart with Assigned Root State Tests", {
  setup: function() {
    obj1 = SC.Object.extend(SC.StatechartManager, {
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
          foo: function() {
            this.gotoState('b');
          }
        }),
        
        b: SC.State.design({
          bar: function() {
            this.gotoState('a');
          }
        })
        
      })
    });
    
    obj1 = obj1.create();
    rootState1 = obj1.get('rootState');
    stateA = obj1.getState('a');
    stateB = obj1.getState('b');
    
    obj2 = SC.Object.extend(SC.StatechartManager, {
      autoInitStatechart: NO,
      rootState: SC.State.design()
    });
    
    obj2 = obj2.create();
  },
  
  teardown: function() {
    obj1 = rootState1 = stateA = stateB = null;
    obj2 = null;
  }
});

test("check obj1", function() {
  ok(obj1.get('isStatechart'), "obj should be statechart");
  ok(obj1.get('statechartIsInitialized'), "obj should be an initialized statechart");
  ok(SC.kindOf(rootState1, SC.State), "root state should be kind of SC.State");
  equals(obj1.get('initialState'), null, "obj initialState should be null");
  
  ok(stateA.get('isCurrentState'), "state A should be current state");
  ok(!stateB.get('isCurrentState'), "state B should not be current state");
  
  equals(rootState1.get('owner'), obj1, "root state's owner should be obj");
  equals(stateA.get('owner'), obj1, "state A's owner should be obj");
  equals(stateB.get('owner'), obj1, "state B's owner should be obj");
  
  obj1.sendEvent('foo');
  
  ok(!stateA.get('isCurrentState'), "state A should not be current state");
  ok(stateB.get('isCurrentState'), "state B should be current state");
});

test("check obj2", function() {
  ok(obj2.get('isStatechart'), "obj should be statechart");
  ok(!obj2.get('statechartIsInitialized'), "obj not should be an initialized statechart");
  
  obj2.initStatechart();
  
  ok(obj2.get('statechartIsInitialized'), "obj should be an initialized statechart");
});