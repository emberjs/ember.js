// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: No Concurrent States - Goto History State Tests", {
  setup: function() {

    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
        
          initialSubstate: 'c',
          
          c: SC.State.design({
            initialSubstate: 'g',
            g: SC.State.design(),
            h: SC.State.design()
          }),
          
          d: SC.State.design({
            initialSubstate: 'i',
            i: SC.State.design(),
            j: SC.State.design()
          })
          
        }),
        
        b: SC.State.design({
          
          initialSubstate: 'e',
          
          e: SC.State.design({
            initialSubstate: 'k',
            k: SC.State.design(),
            l: SC.State.design()
          }),
          
          f: SC.State.design({
            initialSubstate: 'm',
            m: SC.State.design(),
            n: SC.State.design()
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

test("check initial statechart history states", function() {
  equals(statechart.get('rootState').get('historyState'), statechart.getState('a'), 'root state\'s history state should be state a');
  
  equals(statechart.getState('a').get('historyState'), statechart.getState('c'), 'state a\'s history state should be state c');
  equals(statechart.getState('c').get('historyState'), statechart.getState('g'), 'state c\'s history state should be state g');
  equals(statechart.getState('g').get('historyState'), null, 'state g\'s history state should be null');
  
  equals(statechart.getState('h').get('historyState'), null, 'state h\'s history state should be null');
  equals(statechart.getState('d').get('historyState'), null, 'state d\'s history state should be null');

  equals(statechart.getState('b').get('historyState'), null, 'state b\'s history state should be null');
  equals(statechart.getState('e').get('historyState'), null, 'state e\'s history state should be null');
  equals(statechart.getState('f').get('historyState'), null, 'state f\'s history state should be null');
});

test("go to state h and check history states", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();
  
  statechart.gotoState('h');
  equals(monitor.matchSequence().begin().exited('g').entered('h').end(), true, 'sequence should be exited[f], entered[h]');
  
  equals(statechart.getState('a').get('historyState'), statechart.getState('c'), 'state a\'s history state should be state c');
  equals(statechart.getState('c').get('historyState'), statechart.getState('h'), 'state c\'s history state should be state h');
  equals(statechart.getState('h').get('historyState'), null, 'state h\'s history state should be null');
  equals(statechart.getState('g').get('historyState'), null, 'state g\'s history state should be null');
  
  equals(statechart.getState('d').get('historyState'), null, 'state d\'s history state should be null');
  equals(statechart.getState('b').get('historyState'), null, 'state b\'s history state should be null');
});

test("go to state d and check history states", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();
  
  statechart.gotoState('d');
  equals(monitor.matchSequence().begin().exited('g', 'c').entered('d', 'i').end(), true, 'sequence should be exited[g, c], entered[d, i]');
  
  equals(statechart.getState('a').get('historyState'), statechart.getState('d'), 'state a\'s history state should be state d');
  equals(statechart.getState('d').get('historyState'), statechart.getState('i'), 'state d\'s history state should be state i');
  equals(statechart.getState('c').get('historyState'), statechart.getState('g'), 'state c\'s history state should be state g');
  equals(statechart.getState('h').get('historyState'), null, 'state h\'s history state should be null');
  equals(statechart.getState('g').get('historyState'), null, 'state g\'s history state should be null');
  equals(statechart.getState('i').get('historyState'), null, 'state i\'s history state should be null');
  equals(statechart.getState('j').get('historyState'), null, 'state j\'s history state should be null');
  
  equals(statechart.getState('b').get('historyState'), null, 'state b\'s history state should be null');
});

test("go to state b and check history states", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();
  
  statechart.gotoState('b');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'e', 'k').end(), true, 'sequence should be exited[g, c, a], entered[b, e, k]');
  
  equals(statechart.get('rootState').get('historyState'), statechart.getState('b'), 'root state\'s history state should be state b');
  equals(statechart.getState('b').get('historyState'), statechart.getState('e'), 'state b\'s history state should be e');
  equals(statechart.getState('e').get('historyState'), statechart.getState('k'), 'state e\'s history state should be k');
  equals(statechart.getState('a').get('historyState'), statechart.getState('c'), 'state a\'s history state should be state c');
  equals(statechart.getState('c').get('historyState'), statechart.getState('g'), 'state c\'s history state should be state g');
});

test("go to state j, then state m, then go to state a's history state (non-recursive)", function() {
  var monitor = statechart.get('monitor');
  
  statechart.gotoState('j');
  statechart.gotoState('m');

  monitor.reset();
  statechart.gotoHistoryState('a');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('m', 'f', 'b').entered('a', 'd', 'i').end(), true, 'sequence should be exited[m, f, b], entered[a, d, i]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('i'), true, 'current state should be i');
  equals(statechart.get('rootState').get('historyState'), statechart.getState('a'), 'root state\'s history state should be state a');
  equals(statechart.getState('a').get('historyState'), statechart.getState('d'), 'state a\'s history state should be state d');
  equals(statechart.getState('d').get('historyState'), statechart.getState('i'), 'state d\'s history state should be state i');
  
});

test("go to state j, then state m, then go to state a's history state (recursive)", function() {
  var monitor = statechart.get('monitor');
  
  statechart.gotoState('j');
  statechart.gotoState('m');

  monitor.reset();
  statechart.gotoHistoryState('a', null, YES);
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('m', 'f', 'b').entered('a', 'd', 'j').end(), true, 'sequence should be exited[m, f, b], entered[a, d, j]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('j'), true, 'current state should be j');
  equals(statechart.get('rootState').get('historyState'), statechart.getState('a'), 'root state\'s history state should be state a');
  equals(statechart.getState('a').get('historyState'), statechart.getState('d'), 'state a\'s history state should be state d');
  equals(statechart.getState('d').get('historyState'), statechart.getState('j'), 'state d\'s history state should be state j');
});


test("go to state b's history state (non-recursive)", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();

  statechart.gotoHistoryState('b');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'e', 'k').end(), true, 'sequence should be exited[g, c, a], entered[b, e, k]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('k'), true, 'current state should be k');
  equals(statechart.get('rootState').get('historyState'), statechart.getState('b'), 'root state\'s history state should be state b');
  equals(statechart.getState('b').get('historyState'), statechart.getState('e'), 'state b\'s history state should be state e');
  equals(statechart.getState('e').get('historyState'), statechart.getState('k'), 'state e\'s history state should be state k');
});

test("go to state b's history state (recursive)", function() {
  var monitor = statechart.get('monitor');
  monitor.reset();

  statechart.gotoHistoryState('b', null, YES);
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence().begin().exited('g', 'c', 'a').entered('b', 'e', 'k').end(), true, 'sequence should be exited[g, c, a], entered[b, e, k]');
  equals(statechart.get('currentStateCount'), 1, 'current state count should be 1');
  equals(statechart.stateIsCurrentState('k'), true, 'current state should be k');
  equals(statechart.get('rootState').get('historyState'), statechart.getState('b'), 'root state\'s history state should be state b');
  equals(statechart.getState('b').get('historyState'), statechart.getState('e'), 'state b\'s history state should be state e');
  equals(statechart.getState('e').get('historyState'), statechart.getState('k'), 'state e\'s history state should be state k');
});