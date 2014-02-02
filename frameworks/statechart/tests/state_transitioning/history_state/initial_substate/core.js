// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart, stateA, stateB, stateC;

module("SC.HistoryState Tests", {
  setup: function() {
    statechart = SC.Statechart.create({initialState: 'a', a: SC.State.design()});
    stateA = SC.State.create({ name: 'stateA' });
    stateB = SC.State.create({ name: 'stateB' });
    stateC = SC.State.create({ name: 'stateC' });
  },
  
  teardown: function() {
    statechart = stateA = stateB = stateC = null;
  }
});

test("Check default history state", function() {
  var historyState = SC.HistoryState.create();
  
  equals(historyState.get('isRecursive'), false);
});

test("Check assigned history state", function() {  
  var historyState = SC.HistoryState.create({
    isRecursive: YES,
    statechart: statechart,
    parentState: stateA,
    defaultState: stateB
  });
  
  equals(historyState.get('statechart'), statechart);
  equals(historyState.get('parentState'), stateA);
  equals(historyState.get('defaultState'), stateB);
  equals(historyState.get('isRecursive'), true);
  equals(historyState.get('state'), stateB);
  
  stateA.set('historyState', stateC);
  
  equals(historyState.get('state'), stateC);
  
  stateA.set('historyState', null);
  
  equals(historyState.get('state'), stateB);
});