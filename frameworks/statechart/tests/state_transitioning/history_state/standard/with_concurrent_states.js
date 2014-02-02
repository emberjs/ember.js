// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals Ki */

var statechart = null;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: With Concurrent States - Goto History State Tests", {
  setup: function() {
    
    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'x',
        
        x: SC.State.design({
                
          substatesAreConcurrent: YES,
          
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

test("send event eventA", function() {
  var monitor = statechart.get('monitor'),
      stateA = statechart.getState('a'),
      stateB = statechart.getState('b'),
      stateC = statechart.getState('c'),
      stateD = statechart.getState('d'),
      stateE = statechart.getState('e'),
      stateF = statechart.getState('f'),
      stateZ = statechart.getState('z');

  stateC.gotoState('d');
  stateE.gotoState('f');
  
  equals(stateA.get('historyState'), stateD, 'state a should have state d as its history state');
  equals(stateB.get('historyState'), stateF, 'state b should have state f as its history state');
  equals(stateD.get('isCurrentState'), true, 'state d should be current state');
  equals(stateF.get('isCurrentState'), true, 'state f should be current state');
  equals(stateE.get('isCurrentState'), false, 'state e should not be current state');
  
  monitor.reset();
  
  stateD.gotoState('z');
  equals(stateZ.get('isCurrentState'), true, 'state z should be current state');
  
  stateZ.gotoHistoryState('a');
  
  equals(stateA.get('historyState'), stateD, 'state a should have state d as its history state');
  equals(stateB.get('historyState'), stateE, 'state b should have state e as its history state');
  equals(stateD.get('isCurrentState'), true, 'state d should be current state');
  equals(stateF.get('isCurrentState'), false, 'state f should not be current state');
  equals(stateE.get('isCurrentState'), true, 'state e should be current state');
  
});