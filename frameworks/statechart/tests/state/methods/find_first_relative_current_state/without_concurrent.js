// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var sc, root, stateA, stateB, stateC, stateD, stateE, stateF;

module("SC.State: findFirstRelativeCurrentState method Tests (without concurrent states)", {
  
  setup: function() {
    
    sc = SC.Statechart.create({
      initialState: 'a',
    
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
      
    });
    
    sc.initStatechart();
    
    root = sc.get('rootState');
    stateA = sc.getState('a');
    stateB = sc.getState('b');
    stateC = sc.getState('c');
    stateD = sc.getState('d');
    stateE = sc.getState('e');
    stateF = sc.getState('f');
  },
  
  teardown: function() {
    sc = root = stateA = stateB = stateC = stateD = stateE = stateF = null;
  }
  
});

test("check when current state is state C", function() {
  equals(root.findFirstRelativeCurrentState(), stateC, "root state should return state C");
  equals(stateA.findFirstRelativeCurrentState(), stateC, "state A should return state C");
  equals(stateB.findFirstRelativeCurrentState(), stateC, "state B should return state C");
  equals(stateC.findFirstRelativeCurrentState(), stateC, "state C should return state C");
  equals(stateD.findFirstRelativeCurrentState(), stateC, "state D should return state C");
  equals(stateE.findFirstRelativeCurrentState(), stateC, "state E should return state C");
  equals(stateF.findFirstRelativeCurrentState(), stateC, "state F should return state C");
});

test("check when current state is state F", function() {
  sc.gotoState(stateF);
  
  equals(root.findFirstRelativeCurrentState(), stateF, "root state should return state F");
  equals(stateA.findFirstRelativeCurrentState(), stateF, "state A should return state F");
  equals(stateB.findFirstRelativeCurrentState(), stateF, "state B should return state F");
  equals(stateC.findFirstRelativeCurrentState(), stateF, "state C should return state F");
  equals(stateD.findFirstRelativeCurrentState(), stateF, "state D should return state F");
  equals(stateE.findFirstRelativeCurrentState(), stateF, "state E should return state F");
  equals(stateF.findFirstRelativeCurrentState(), stateF, "state F should return state F");
});