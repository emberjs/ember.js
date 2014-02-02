// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody */
var pane, fooView, barView, defaultResponder, evt, callCount ;
module("SC.Pane#sendEvent", {
  setup: function() {

    callCount = 0;
    var handler = function(theEvent) {
      callCount++ ;
      equals(theEvent, evt, 'should pass event');
    };

    defaultResponder = SC.Object.create({ defaultEvent: handler });
    pane = SC.Pane.create({
      defaultResponder: defaultResponder,
      paneEvent: handler,
      childViews: [SC.View.extend({
        fooEvent: handler,
        childViews: [SC.View.extend({
          barEvent: handler
        })]
      })]
    });
    fooView = pane.childViews[0];
    ok(fooView.fooEvent, 'has fooEvent handler');

    barView = fooView.childViews[0];
    ok(barView.barEvent, 'has barEvent handler');

    evt = SC.Object.create(); // mock
  },

  teardown: function() {
    pane.destroy();
    pane = fooView = barView = defaultResponder = evt = null ;
  }
});

test("when invoked with target = nested view", function() {
  var handler ;

  // test event handler on target
  callCount = 0;
  handler = pane.sendEvent('barEvent', evt, barView);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, barView, 'should return view that handled event');

  // test event handler on target parent
  callCount = 0;
  handler = pane.sendEvent('fooEvent', evt, barView);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, fooView, 'should return responder that handled event');

  // test event handler on default responder
  callCount = 0;
  handler = pane.sendEvent('defaultEvent', evt, barView);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, defaultResponder, 'should return responder that handled event');

  // test unhandled event handler
  callCount = 0;
  handler = pane.sendEvent('imaginary', evt, barView);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

});



test("when invoked with target = middle view", function() {
  var handler ;

  // test event handler on child view of target
  callCount = 0;
  handler = pane.sendEvent('barEvent', evt, fooView);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test event handler on target
  callCount = 0;
  handler = pane.sendEvent('fooEvent', evt, fooView);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, fooView, 'should return responder that handled event');

  // test event handler on default responder
  callCount = 0;
  handler = pane.sendEvent('defaultEvent', evt, fooView);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, defaultResponder, 'should return responder that handled event');

  // test unhandled event handler
  callCount = 0;
  handler = pane.sendEvent('imaginary', evt, fooView);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

});



test("when invoked with target = pane", function() {
  var handler ;

  // test event handler on child view of target
  callCount = 0;
  handler = pane.sendEvent('barEvent', evt, pane);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test event handler on target
  callCount = 0;
  handler = pane.sendEvent('fooEvent', evt, pane);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test event handler on default responder
  callCount = 0;
  handler = pane.sendEvent('defaultEvent', evt, pane);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, defaultResponder, 'should return responder that handled event');

  // test unhandled event handler
  callCount = 0;
  handler = pane.sendEvent('imaginary', evt, pane);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

});



test("when invoked with target = null", function() {
  var handler ;

  // should start @ first responder
  pane.firstResponder = fooView;

  // test event handler on child view of target
  callCount = 0;
  handler = pane.sendEvent('barEvent', evt);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test event handler on target
  callCount = 0;
  handler = pane.sendEvent('fooEvent', evt);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, fooView, 'should return responder that handled event');

  // test event handler on default responder
  callCount = 0;
  handler = pane.sendEvent('defaultEvent', evt);
  equals(callCount, 1, 'should invoke handler');
  equals(handler, defaultResponder, 'should return responder that handled event');

  // test unhandled event handler
  callCount = 0;
  handler = pane.sendEvent('imaginary', evt);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test event handler on pane itself
  callCount = 0;
  handler = pane.sendEvent('paneEvent', evt);
  equals(callCount, 1, 'should invoke handler on pane');
  equals(handler, pane, 'should return pane as responder that handled event');

});

test("when invoked with target = null, no default or first responder", function() {
  var handler ;

  // no first or default responder
  pane.set('firstResponder', null);
  pane.set('defaultResponder', null);

  // test event handler on child view of target
  callCount = 0;
  handler = pane.sendEvent('barEvent', evt);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test event handler on target
  callCount = 0;
  handler = pane.sendEvent('fooEvent', evt);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test unhandled event handler
  callCount = 0;
  handler = pane.sendEvent('imaginary', evt);
  equals(callCount, 0, 'should not invoke handler');
  equals(handler, null, 'should return no responder');

  // test event handler on pane itself
  callCount = 0;
  handler = pane.sendEvent('paneEvent', evt);
  equals(callCount, 1, 'should invoke handler on pane');
  equals(handler, pane, 'should return pane as responder that handled event');

});

