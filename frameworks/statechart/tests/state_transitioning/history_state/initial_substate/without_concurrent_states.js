// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

window.statechart = null;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.HistoryState - Without Concurrent States Tests", {
  setup: function() {
   
    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
      
        initialSubstate: 'a',
        
        a: SC.State.design({
          
          initialSubstate: SC.HistoryState.design({
            defaultState: 'c'
          }),
          
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
          
          initialSubstate: SC.HistoryState.design({
            isRecursive: YES,
            defaultState: 'e'
          }),
          
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
    //statechart = null;
  }
});

test("check initial substate after statechart init", function() {
  var monitor = statechart.get('monitor'),
      root = statechart.get('rootState'),
      a = statechart.getState('a'),
      b = statechart.getState('b'),
      c = statechart.getState('c'),
      d = statechart.getState('d'),
      e = statechart.getState('e'),
      f = statechart.getState('f'),
      g = statechart.getState('g'),
      h = statechart.getState('h'),
      i = statechart.getState('i'),
      j = statechart.getState('j'),
      k = statechart.getState('k'),
      l = statechart.getState('l'),
      m = statechart.getState('m'),
      n = statechart.getState('n'),
      aInitSubstate = a.get('initialSubstate'),
      bInitSubstate = b.get('initialSubstate');
  
  equals(monitor.get('length'), 4, 'initial state sequence should be of length 3');
  equals(monitor.matchSequence().begin().entered(root, a, c, g).end(), true, 'initial sequence should be entered[root, a, c, g]');
      
  equals(root.get('initialSubstate'), a, "root state's initial substate should be state a");
  equals(c.get('initialSubstate'), g, "c state's initial substate should be state g");
  equals(d.get('initialSubstate'), i, "d state's initial substate should be state i");
  equals(e.get('initialSubstate'), k, "e state's initial substate should be state k");
  equals(f.get('initialSubstate'), m, "f state's initial substate should be state m");

  equals(SC.kindOf(aInitSubstate, SC.HistoryState), true, "a state's initial substate should be of type SC.HistoryState");
  equals(aInitSubstate.get('isRecursive'), false, "a's initial substate should not be recursive");
  equals(aInitSubstate.get('defaultState'), c, "a's initial substate should have default state c");
  equals(aInitSubstate.get('statechart'), statechart, "a's initial substate should have an assigned statechart");
  equals(aInitSubstate.get('parentState'), a, "a's initial substate should have parent state a");
  equals(aInitSubstate.get('state'), c, "a's initial substate state should be state c");

  equals(SC.kindOf(bInitSubstate, SC.HistoryState), true, "b state's initial substate should be of type SC.HistoryState");
  equals(bInitSubstate.get('isRecursive'), true, "b's initial substate should be recursive");
  equals(bInitSubstate.get('defaultState'), e, "b's initial substate should have default state e");
  equals(bInitSubstate.get('statechart'), statechart, "b's initial substate should have an assigned statechart");
  equals(bInitSubstate.get('parentState'), b, "b's initial substate should have parent state b");
  equals(bInitSubstate.get('state'), e, "b's initial substate state should be state e");
  
  equals(a.get('historyState'), c);
  equals(b.get('historyState'), null);
});

test("check state sequence after going to state b", function() {
  var monitor = statechart.get('monitor'),
      root = statechart.get('rootState'),
      b = statechart.getState('b'),
      e = statechart.getState('e');

  monitor.reset();
  
  statechart.gotoState('b');
  
  equals(b.get('historyState'), e);  
  equals(b.getPath('initialSubstate.state'), e);
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence()
                  .begin()
                  .exited('g', 'c', 'a')
                  .entered('b', 'e', 'k')
                  .end(), true,
        'sequence should be exited[g, c, a], entered[b, e, k]');
});

test("check state sequence with state a's historyState assigned", function() {
  var monitor = statechart.get('monitor'),
      root = statechart.get('rootState'),
      a = statechart.getState('a'),
      b = statechart.getState('b'),
      c = statechart.getState('c'),
      d = statechart.getState('d'),
      e = statechart.getState('e'),
      f = statechart.getState('f'),
      g = statechart.getState('g'),
      h = statechart.getState('h'),
      i = statechart.getState('i'),
      j = statechart.getState('j'),
      k = statechart.getState('k'),
      l = statechart.getState('l'),
      m = statechart.getState('m'),
      n = statechart.getState('n');
  
  statechart.gotoState('j');
  
  equals(a.get('historyState'), d);
  equals(d.get('historyState'), j);
  
  equals(a.getPath('initialSubstate.state'), d);
  
  statechart.gotoState('b');
  
  monitor.reset();
  
  statechart.gotoState('a');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence()
                  .begin()
                  .exited(k, e, b)
                  .entered(a, d, i)
                  .end(), true,
        'sequence should be exited[k, e, b], entered[a, d, i]');
  
});

test("check state sequence with state b's historyState assigned", function() {
  var monitor = statechart.get('monitor'),
      root = statechart.get('rootState'),
      b = statechart.getState('b'),
      f = statechart.getState('f'),
      n = statechart.getState('n');
  
  statechart.gotoState('n');
  
  equals(b.get('historyState'), f);
  equals(f.get('historyState'), n);
  
  equals(b.getPath('initialSubstate.state'), f);
  
  statechart.gotoState('a');
  
  monitor.reset();
  
  statechart.gotoState('b');
  
  equals(monitor.get('length'), 6, 'initial state sequence should be of length 6');
  equals(monitor.matchSequence()
                  .begin()
                  .exited('g', 'c', 'a')
                  .entered('b', 'f', 'n')
                  .end(), true,
        'sequence should be exited[g, c, a], entered[b, f, n]');
});