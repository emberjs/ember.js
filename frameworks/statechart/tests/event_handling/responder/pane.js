// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC statechart */

window.startchart = null;
var pane, button, fooInvokedCount;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: No Concurrent States - Pane Default Responder Tests", {
  setup: function() {
    fooInvokedCount = 0;
    
    window.statechart = SC.Statechart.create({
      
      rootState: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
          foo: function() { 
            fooInvokedCount++;
            this.gotoState('b'); 
          }
        }),
        
        b: SC.State.design({
          foo: function() {
            fooInvokedCount++;
            this.gotoState('a'); 
          }
        })
        
      })
      
    });
    
    statechart.initStatechart();
    
    SC.RunLoop.begin();
    pane = SC.MainPane.create({
      defaultResponder: 'statechart',
      childViews: [
        SC.ButtonView.extend({
          action: 'foo'
        })
      ]
    });
    pane.append();
    SC.RunLoop.end();
    
    button = pane.childViews[0];
  },
  
  teardown: function() {
    pane.remove();
    pane = button = fooInvokedCount = null;
    window.statechart = null;
  }
});

test("click button", function() {
  var target;
  
  equals(fooInvokedCount, 0, 'foo should not have been invoked');
  equals(statechart.stateIsCurrentState('a'), true, 'state a should be a current state');
  equals(statechart.stateIsCurrentState('b'), false, 'state b should not be a current state');
  
  target = button.$().get(0);
  SC.Event.trigger(target, "mousedown");
  target = button.$().get(0);
  SC.Event.trigger(target, "mouseup");
  
  equals(fooInvokedCount, 1, 'foo should have been invoked once');
  equals(statechart.stateIsCurrentState('a'), false, 'state a should not be a current state');
  equals(statechart.stateIsCurrentState('b'), true, 'state b should be a current state');
  
  target = button.$().get(0);
  SC.Event.trigger(target, "mousedown");
  target = button.$().get(0);
  SC.Event.trigger(target, "mouseup");
  
  equals(fooInvokedCount, 2, 'foo should have been invoked twice');
  equals(statechart.stateIsCurrentState('a'), true, 'state a should be a current state');
  equals(statechart.stateIsCurrentState('b'), false, 'state b should not be a current state');
});