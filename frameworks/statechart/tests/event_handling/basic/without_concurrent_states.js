// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: No Concurrent States - Send Event Tests", {
  setup: function() {

    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
        
          initialSubstate: 'c',
          
          eventB: function() {
            this.gotoState('b');
          },
          
          c: SC.State.design({
            eventA: function() { this.gotoState('d'); }
          }),
          
          d: SC.State.design({
            sender: null,
            context: null,
            eventC: function(sender, context) {
              this.set('sender', sender);
              this.set('context', context);
              this.gotoState('f');
            }
          })
          
        }),
        
        b: SC.State.design({
          
          initialSubstate: 'e',
          
          e: SC.State.design(),
          
          f: SC.State.design()
          
        })
        
      })
      
    });
    
    statechart.initStatechart();
  },
  
  teardown: function() {
    statechart.destroy();
  }
});

test("send event eventA while in state C", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();
  statechart.sendEvent('eventA');
  
  equals(monitor.get('length'), 2, 'state sequence should be of length 2');
  equals(monitor.matchSequence().begin().exited('c').entered('d').end(), true, 'sequence should be exited[c], entered[d]');
  equals(statechart.stateIsCurrentState('d'), true, 'current state should be d');
});

test("send event eventB while in parent state A", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();
  statechart.sendEvent('eventB');
  
  equals(monitor.get('length'), 4, 'state sequence should be of length 4');
  equals(monitor.matchSequence().begin().exited('c', 'a').entered('b', 'e').end(), true, 'sequence should be exited[c, a], entered[b, e]');
  equals(statechart.stateIsCurrentState('e'), true, 'current state should be e');
});

test("send event eventC while in state D", function() {
  var monitor = statechart.get('monitor'),
      stateD = statechart.getState('d');
  
  statechart.gotoState('d');
  
  monitor.reset();
  
  statechart.sendEvent('eventC', statechart, 'foobar');
  
  equals(monitor.get('length'), 4, 'state sequence should be of length 4');
  equals(monitor.matchSequence().begin().exited('d', 'a').entered('b', 'f').end(), true, 'sequence should be exited[d, a], entered[b, f]');
  equals(statechart.stateIsCurrentState('f'), true, 'current state should be f');
  equals(stateD.get('sender'), statechart);
  equals(stateD.get('context'), 'foobar');
});

test("send event eventC while in state C", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();
  statechart.sendEvent('eventC');
  
  equals(monitor.get('length'), 0, 'state sequence should be of length 0');
  equals(statechart.stateIsCurrentState('c'), true, 'current state should be c');
});

test("send event eventD while in state C", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();
  statechart.sendEvent('eventD');
  
  equals(monitor.get('length'), 0, 'state sequence should be of length 0');
  equals(statechart.stateIsCurrentState('c'), true, 'current state should be c');
});