// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;

module("SC.Statechart: State - isCurrentState Property Tests", {
  setup: function() {

    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.extend({
        
        initialSubstate: 'a',
        
        a: SC.State.extend(),
        
        b: SC.State.extend()
        
      })
      
    });
    
    statechart.initStatechart();
  },
  
  teardown: function() {
    statechart.destroy();
    statechart = null;
  }
});

test("check observing isCurrentState", function() {
  var a = statechart.getState('a'),
      value;

  SC.addObserver(a, 'isCurrentState', function() {
    value = a.get('isCurrentState');
  });
  
  equals(a.get('isCurrentState'), true);
  
  SC.run(function() { statechart.gotoState('b'); });
  equals(a.get('isCurrentState'), false);
  equals(value, false);
  
  SC.run(function() { statechart.gotoState('a'); });
  equals(a.get('isCurrentState'), true);
  equals(value, true);
  
  SC.run(function() { statechart.gotoState('b'); });
  equals(a.get('isCurrentState'), false);
  equals(value, false);

});