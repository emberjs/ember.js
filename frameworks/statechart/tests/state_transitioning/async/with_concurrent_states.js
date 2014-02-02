// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: With Concurrent States - Goto State Asynchronous Tests", {
  setup: function() {
    
    var StateMixin = {
      
      counter: 0,
      
      foo: function() {
        this.set('counter', this.get('counter') + 1);
        this.resumeGotoState();
      },
      
      enterState: function() {
        return this.performAsync('foo');
      },
      
      exitState: function() {
        return this.performAsync(function() { this.foo(); });
      }
    };
  
    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design(),
        
        b: SC.State.design({
          
          substatesAreConcurrent: YES,
          
          c: SC.State.design(StateMixin),
          
          d: SC.State.design(StateMixin)
          
        })
        
      })
      
    });
    
    statechart.initStatechart();
  },
  
  teardown: function() {
    statechart.destroy();
    statechart = null;
  }
});

test("go to state b", function() {
  var monitor = statechart.get('monitor'),
      stateA = statechart.getState('a'),
      stateC = statechart.getState('c'),
      stateD = statechart.getState('d');
  
  monitor.reset();
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  stateA.gotoState('b');
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  equals(monitor.matchSequence().begin()
                  .exited('a')
                  .entered('b')
                  .beginConcurrent()
                    .entered('c', 'd')
                  .endConcurrent()
                .end(), 
          true, 'sequence should be exited[a], entered[b, c, d]');
  equals(statechart.get('currentStateCount'), 2, 'current state count should be 2');
  equals(stateC.get('isCurrentState'), true, 'current state should be c');
  equals(stateD.get('isCurrentState'), true, 'current state should be d');
  equals(stateC.get('counter'), 1, "state c should have counter equal to 1");
  equals(stateD.get('counter'), 1, "state d should have counter equal to 1");
});

test("go to state b, then back to state a", function() {
  var monitor = statechart.get('monitor'),
      stateA = statechart.getState('a'),
      stateB = statechart.getState('b'),
      stateC = statechart.getState('c'),
      stateD = statechart.getState('d');
  
  stateA.gotoState('b');
  
  monitor.reset();
  
  stateC.gotoState('a');
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  equals(monitor.matchSequence()
                .begin()
                .exited('c', 'd', 'b')
                .entered('a')
                .end(), 
          true, 'sequence should be exited[c, d, b], entered[a]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(stateA.get('isCurrentState'), true, 'current state should not be a');
  equals(stateC.get('isCurrentState'), false, 'current state should not be c');
  equals(stateD.get('isCurrentState'), false, 'current state should not be d');
  equals(stateC.get('counter'), 2, "state c should have counter equal to 2");
  equals(stateD.get('counter'), 2, "state d should have counter equal to 2");
});