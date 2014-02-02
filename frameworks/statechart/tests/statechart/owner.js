// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC statechart State */

var obj1, rootState1, stateA, stateB, stateX, stateY, stateZ;
var obj2, rootState2, stateC, stateD;
var obj3, rootState3, stateE, stateF;
var owner, owner2;
var TestObject, TestState;

module("SC.Statechart: Change Statechart Owner Property Tests", {
  setup: function() {
    owner = SC.Object.create({
      toString: function() { return "owner"; }
    });
    
    owner2 = SC.Object.create({
      toString: function() { return "owner2"; }
    });
    
    TestState = SC.State.extend({
      accessedOwner: null,
      
      reset: function() {
        this.set('accessedOwner', null);
      },
      
      render: function() {
        this.set('accessedOwner', this.get('owner'));
      }
    });
    
    TestObject = SC.Object.extend(SC.StatechartManager, {
      render: function() {
        this.invokeStateMethod('render');
      }
    });
    
    obj1 = TestObject.extend({
      
      initialState: 'stateA',
      
      stateA: TestState.design({
        foo: function() {
          this.gotoState('stateB');
        }
      }),
      
      stateB: TestState.design({
        bar: function() {
          this.gotoState('stateA');
        }
      }),
      
      stateX: TestState.design({
        initialSubstate: 'stateY',
        
        stateY: TestState.design({
          initialSubstate: 'stateZ',
          
          stateZ: TestState.design()
        })
      })

    });
    
    obj1 = obj1.create();
    rootState1 = obj1.get('rootState');
    stateA = obj1.getState('stateA');
    stateB = obj1.getState('stateB');
    stateX = obj1.getState('stateX');
    stateY = obj1.getState('stateY');
    stateZ = obj1.getState('stateZ');  
    
    obj2 = TestObject.extend({
      
      owner: owner,
      
      initialState: 'stateC',
      
      stateC: TestState.design({
        foo: function() {
          this.gotoState('stateD');
        }
      }),
      
      stateD: TestState.design({
        bar: function() {
          this.gotoState('stateC');
        }
      })
      
    });
    
    obj2 = obj2.create();
    rootState2 = obj2.get('rootState');
    stateC = obj2.getState('stateC');
    stateD = obj2.getState('stateD');
    
    obj3 = TestObject.extend({
      
      statechartOwnerKey: 'fooOwner',
      
      fooOwner: owner,
      
      initialState: 'stateE',
      
      stateE: TestState.design({
        foo: function() {
          this.gotoState('stateF');
        }
      }),
      
      stateF: TestState.design({
        bar: function() {
          this.gotoState('stateE');
        }
      })
      
    });
    
    obj3 = obj3.create();
    rootState3 = obj3.get('rootState');
    stateE = obj3.getState('stateE');
    stateF = obj3.getState('stateF');
  },
  
  teardown: function() {
    obj1 = rootState1 = stateA = stateB = stateX = stateY = stateZ = null;
    obj2 = rootState2 = stateC = stateD = null;
    obj3 = rootState3 = stateE = stateF = null;
    owner = owner2 = null;
    TestObject = TestState = null;
  }
});

test("check obj1 -- basic owner get and set", function() {
  equals(rootState1.get('owner'), obj1, "root state's owner should be obj");
  equals(stateA.get('owner'), obj1, "state A's owner should be obj");
  equals(stateB.get('owner'), obj1, "state B's owner should be obj");
  equals(stateX.get('owner'), obj1, "state X's owner should be obj");
  equals(stateY.get('owner'), obj1, "state Y's owner should be obj");
  equals(stateZ.get('owner'), obj1, "state Z's owner should be obj");
  
  obj1.set('owner', owner);
  
  equals(rootState1.get('owner'), owner, "root state's owner should be owner");
  equals(stateA.get('owner'), owner, "state A's owner should be owner");
  equals(stateB.get('owner'), owner, "state B's owner should be owner");
  equals(stateX.get('owner'), owner, "state X's owner should be owner");
  equals(stateY.get('owner'), owner, "state Y's owner should be owner");
  equals(stateZ.get('owner'), owner, "state Z's owner should be owner");
  
  obj1.set('owner', null);
  
  equals(rootState1.get('owner'), obj1, "root state's owner should be obj");
  equals(stateA.get('owner'), obj1, "state A's owner should be obj");
  equals(stateB.get('owner'), obj1, "state B's owner should be obj");
  equals(stateX.get('owner'), obj1, "state X's owner should be obj");
  equals(stateY.get('owner'), obj1, "state Y's owner should be obj");
  equals(stateZ.get('owner'), obj1, "state Z's owner should be obj");
});

test("check stateA -- access owner via invokeStateMethod", function() {
  ok(stateA.get('isCurrentState'));
  equals(stateA.get('accessedOwner'), null);
  
  obj1.render();
  
  equals(stateA.get('accessedOwner'), obj1);
  
  stateA.reset();
  obj1.set('owner', owner);
  obj1.render();
  
  equals(stateA.get('accessedOwner'), owner);
});

test("check stateZ -- access owner via invokeStateMethod", function() {
  obj1.gotoState(stateZ);
  ok(stateZ.get('isCurrentState'));
  
  equals(stateZ.get('accessedOwner'), null);
  
  obj1.render();
  
  equals(stateZ.get('accessedOwner'), obj1);
  
  stateA.reset();
  obj1.set('owner', owner);
  obj1.render();
  
  equals(stateZ.get('accessedOwner'), owner);
});

test("check obj2 -- statechartOwnerKey", function() {
  equals(rootState2.get('owner'), owner, "root state's owner should be owner");
  equals(stateC.get('owner'), owner, "state C's owner should be owner");
  equals(stateD.get('owner'), owner, "state D's owner should be owner");
  
  obj2.set('owner', null);
  
  equals(rootState2.get('owner'), obj2, "root state's owner should be obj");
  equals(stateC.get('owner'), obj2, "state C's owner should be obj");
  equals(stateD.get('owner'), obj2, "state D's owner should be obj");
});

test("check obj3 -- basic owner get and set", function() {
  equals(obj3.get('statechartOwnerKey'), 'fooOwner', "obj's statechartOwnerKey should be fooOwner");
  equals(obj3.get('fooOwner'), owner, "obj's fooOwner should be owner");
  
  equals(rootState3.get('owner'), owner, "root state's owner should be owner");
  equals(stateE.get('owner'), owner, "state E's owner should be owner");
  equals(stateF.get('owner'), owner, "state F's owner should be owner");
  
  obj3.set('fooOwner', null);
  
  equals(rootState3.get('owner'), obj3, "root state's owner should be obj");
  equals(stateE.get('owner'), obj3, "state E's owner should be obj");
  equals(stateF.get('owner'), obj3, "state F's owner should be obj");
  
  obj3.set('fooOwner', owner2);
  
  equals(rootState3.get('owner'), owner2, "root state's owner2 should be owner2");
  equals(stateE.get('owner'), owner2, "state E's owner2 should be owner2");
  equals(stateF.get('owner'), owner2, "state F's owner2 should be owner2");
  
  ok(obj3.hasObserverFor('fooOwner'));
  equals(rootState3.get('owner'), owner2);
  
  obj3.destroy();
  
  ok(!obj3.hasObserverFor('fooOwner'));
  equals(rootState3.get('owner'), null);
});