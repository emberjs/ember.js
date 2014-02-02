// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: No Concurrent States - Transient State Transition Tests", {
  setup: function() {

    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
        
          initialSubstate: 'b',
                    
          b: SC.State.design({
            eventC: function() { this.gotoState('c'); },
            eventD: function() { this.gotoState('d'); },
            eventE: function() { this.gotoState('e'); },
            eventX: function() { this.gotoState('x'); }
          }),
          
          c: SC.State.design({
            enterState: function() { this.gotoState('z'); }
          }),
          
          d: SC.State.design({
            enterState: function() { this.gotoState('c'); }
          }),
          
          e: SC.State.design({
            enterState: function() { this.gotoState('f'); }
          }),
          
          f: SC.State.design(),
          
          g: SC.State.design({
            
            initialSubstate: 'x',
            
            foo: function() { /* no-op */ },
            
            enterState: function() {
              return this.performAsync('foo');
            },
            
            x: SC.State.design({
              enterState: function() { this.gotoState('h'); }
            })
  
          }),
          
          h: SC.State.design()
          
        }),
        
        z: SC.State.design()
        
      })
      
    });
    
    statechart.initStatechart();
  },
  
  teardown: function() {
    statechart.destroy();
    statechart = null;
  }
});

test("enter transient state C", function() {
  var monitor = statechart.get('monitor'),
      stateA = statechart.getState('a'),
      stateC = statechart.getState('c');

  monitor.reset();
  statechart.sendEvent('eventC');
  
  equals(monitor.get('length'), 5, 'state sequence should be of length 5');
  equals(monitor.matchSequence()
          .begin()
            .exited('b')
            .entered('c')
            .exited('c', 'a')
            .entered('z')
          .end(), true, 
        'sequence should be exited[b], entered[c], exited[c, a], entered[z]');
  equals(statechart.stateIsCurrentState('z'), true, 'current state should be z');
  
  equals(stateA.get('historyState'), stateC);
});

test("enter transient state D", function() {
  var monitor = statechart.get('monitor'),
      stateA = statechart.getState('a'),
      stateC = statechart.getState('c');

  monitor.reset();
  statechart.sendEvent('eventD');
  
  equals(monitor.get('length'), 7, 'state sequence should be of length 7');
  equals(monitor.matchSequence()
          .begin()
            .exited('b')
            .entered('d')
            .exited('d')
            .entered('c')
            .exited('c', 'a')
            .entered('z')
          .end(), true, 
        'sequence should be exited[b], entered[d], exited[d], entered[c], exited[c, a], entered[z]');
  equals(statechart.stateIsCurrentState('z'), true, 'current state should be z');
  
  equals(stateA.get('historyState'), stateC);
});

test("enter transient state X", function() {
  var monitor = statechart.get('monitor'),
      stateA = statechart.getState('a'),
      stateH = statechart.getState('h');

  monitor.reset();
  statechart.sendEvent('eventX');
  
  equals(monitor.get('length'), 2, 'state sequence should be of length 2');
  equals(monitor.matchSequence()
          .begin()
            .exited('b')
            .entered('g')
          .end(), true, 
        'sequence should be exited[b], entered[g]');
  equals(statechart.get('gotoStateActive'), true, 'statechart should be in active goto state');
  equals(statechart.get('gotoStateSuspended'), true, 'statechart should have a suspended, active goto state');
  
  statechart.resumeGotoState();
  
  equals(monitor.get('length'), 6, 'state sequence should be of length 6');
  equals(monitor.matchSequence()
          .begin()
            .exited('b')
            .entered('g', 'x')
            .exited('x', 'g')
            .entered('h')
          .end(), true, 
        'sequence should be exited[b], entered[g, x], exited[x, g], entered[h]');
  equals(statechart.get('gotoStateActive'), false, 'statechart should not be in active goto state');
  equals(statechart.get('gotoStateSuspended'), false, 'statechart should not have a suspended, active goto state');
  
  equals(stateA.get('historyState'), stateH);
});