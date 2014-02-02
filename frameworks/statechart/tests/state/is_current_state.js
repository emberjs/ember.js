// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart = null;

module("SC.Statechart: State - isCurrentState Property Tests", {
  setup: function() {

    statechart = SC.Statechart.create({
      
      monitorIsActive: YES,
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design(),
        
        b: SC.State.design()
        
      })
      
    });
    
    statechart.initStatechart();
  },
  
  teardown: function() {
    statechart.destroy();
    statechart = null;
  }
});

test("check binding to isCurrentState", function() {
  var a = statechart.getState('a');

  var o = SC.Object.create({
    value: null,
    valueBinding: SC.Binding.oneWay().from('isCurrentState', a)
  });
  
  SC.run();
  equals(a.get('isCurrentState'), true);
  equals(o.get('value'), true);
  
  SC.run(function() { statechart.gotoState('b'); });
  equals(a.get('isCurrentState'), false);
  equals(o.get('value'), false);
  
  SC.run(function() { statechart.gotoState('a'); });
  equals(a.get('isCurrentState'), true);
  equals(o.get('value'), true);
  
  SC.run(function() { statechart.gotoState('b'); });
  equals(a.get('isCurrentState'), false);
  equals(o.get('value'), false);

});