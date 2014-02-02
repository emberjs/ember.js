// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: No Concurrent States - Goto State Asynchronous Tests", {
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
          
          methodInvoked: null,
          
          enterState: function() {
            return this.performAsync('foo');
          },
          
          exitState: function() {
            return this.performAsync('bar');
          },
          
          foo: function(arg1, arg2) {
            this.set('methodInvoked', 'foo');
          },

          bar: function(arg1, arg2) {
            this.set('methodInvoked', 'bar');
          }
          
        }),
        
        c: SC.State.design(StateMixin, {
          
          initialSubstate: 'd',
          
          d: SC.State.design(StateMixin, {
            
            initialSubstate: 'e',
            
            e: SC.State.design(StateMixin)
            
          })
          
        })
        
      })
      
    });
    
    statechart.initStatechart();
  },
  
  teardown: function() {
    statechart.destroy();
  }
});

test("go to state b", function() {
  var stateB = statechart.getState('b'),
      monitor = statechart.get('monitor');
  
  monitor.reset();
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  statechart.gotoState(stateB);
  
  equals(statechart.get('gotoStateActive'), YES, "statechart should have active gotoState");
  equals(statechart.get('gotoStateSuspended'), YES, "statechart should have active gotoState suspended");
  
  statechart.resumeGotoState();
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  equals(monitor.matchSequence().begin().exited('a').entered('b').end(), true, 'sequence should be exited[a], entered[b]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('a'), false, 'current state should not be a');
  equals(statechart.stateIsCurrentState('b'), true, 'current state should be b');
  equals(stateB.get('methodInvoked'), 'foo', "state b should have invoked method foo");
});

test("go to state b and then back to state a", function() {
  var stateA = statechart.getState('a'),
      stateB = statechart.getState('b'),
      monitor = statechart.get('monitor');
  
  statechart.gotoState(stateB);
  statechart.resumeGotoState();
  
  monitor.reset();
  
  statechart.gotoState(stateA);
  
  equals(statechart.get('gotoStateActive'), YES, "statechart should have active gotoState");
  equals(statechart.get('gotoStateSuspended'), YES, "statechart should have active gotoState suspended");
  
  statechart.resumeGotoState();
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  equals(monitor.matchSequence().begin().exited('b').entered('a').end(), true, 'sequence should be exited[b], entered[a]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('a'), true, 'current state should be a');
  equals(statechart.stateIsCurrentState('b'), false, 'current state should not be b');
  equals(stateB.get('methodInvoked'), 'bar', "state b should have invoked method bar");
});

test("go to state c", function() {
  var stateC = statechart.getState('c'),
      stateD = statechart.getState('d'),
      stateE = statechart.getState('e'),
      monitor = statechart.get('monitor');
  
  monitor.reset();
  
  statechart.gotoState(stateC);
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  equals(monitor.matchSequence().begin().exited('a').entered('c', 'd', 'e').end(), true, 
        'sequence should be exited[a], entered[c, d, e]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('a'), false, 'current state should not be a');
  equals(statechart.stateIsCurrentState('e'), true, 'current state should be e');
  equals(stateC.get('counter'), 1, 'state c counter should be 1');
  equals(stateD.get('counter'), 1, 'state d counter should be 1');
  equals(stateE.get('counter'), 1, 'state e counter should be 1');
});

test("go to state c and then back to state a", function() {
  var stateA = statechart.getState('a'),
      stateC = statechart.getState('c'),
      stateD = statechart.getState('d'),
      stateE = statechart.getState('e'),
      monitor = statechart.get('monitor');
  
  statechart.gotoState(stateC);
  
  monitor.reset();
  
  statechart.gotoState(stateA);
  
  equals(statechart.get('gotoStateActive'), NO, "statechart should not have active gotoState");
  equals(statechart.get('gotoStateSuspended'), NO, "statechart should not have active gotoState suspended");
  
  equals(monitor.matchSequence().begin().exited('e', 'd', 'c').entered('a').end(), true, 
        'sequence should be exited[e, d, c], entered[a]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('a'), true, 'current state should be a');
  equals(statechart.stateIsCurrentState('e'), false, 'current state should not be e');
  equals(stateC.get('counter'), 2, 'state c counter should be 2');
  equals(stateD.get('counter'), 2, 'state d counter should be 2');
  equals(stateE.get('counter'), 2, 'state e counter should be 2');
});