// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ CommonSetup */

var pane, r, view ;
CommonSetup = {
  setup: function() {
    pane = SC.Pane.create({
      childViews: [SC.View]
    });
    view = pane.childViews[0];
    pane.makeFirstResponder(view);

    pane.append(); // make visible so it will have root responder
    r = pane.get('rootResponder');
    ok(r, 'has root responder');
  },
  teardown: function() {
    pane.remove();
    pane.destroy();
    pane = r = view = null ;
  }
};

// ..........................................................
// becomeKeyPane()
//
module("SC.Pane#becomeKeyPane", CommonSetup);

test("should become keyPane if not already keyPane", function() {
  ok(r.get('keyPane') !== pane, 'precond - pane is not currently key');

  pane.becomeKeyPane();
  equals(r.get('keyPane'), pane, 'pane should be keyPane');
  equals(pane.get('isKeyPane'), YES, 'isKeyPane should be set to YES');
});

test("should do nothing if acceptsKeyPane is NO", function() {
  ok(r.get('keyPane') !== pane, 'precond - pane is not currently key');

  pane.acceptsKeyPane = NO ;
  pane.becomeKeyPane();
  ok(r.get('keyPane') !== pane, 'pane should not be keyPane');
  equals(pane.get('isKeyPane'), NO, 'isKeyPane should be NO');
});

test("should invoke willBecomeKeyPane & didBecomeKeyPane", function() {
  var callCount = 0 ;
  pane.willBecomeKeyPaneFrom = pane.didBecomeKeyPaneFrom = function() {
    callCount++;
  };

  pane.becomeKeyPane();
  equals(callCount, 2, 'should invoke both callbacks');

  callCount = 0;
  pane.becomeKeyPane();
  equals(callCount, 0, 'should not invoke callbacks if already key pane');
});

test("should invoke callbacks and update isKeyResponder state on firstResponder", function() {
  var callCount = 0;
  view.willBecomeKeyResponderFrom = view.didBecomeKeyResponderFrom =
    function() { callCount++; };

  equals(view.get('isKeyResponder'), NO, 'precond - view is not keyResponder');
  equals(view.get('isFirstResponder'), YES, 'precond - view is firstResponder');

  pane.becomeKeyPane();
  equals(callCount, 2, 'should invoke both callbacks');
  equals(view.get('isKeyResponder'), YES, 'should be keyResponder');
});

// ..........................................................
// resignKeyPane()
//
module("SC.Pane#resignKeyPane", CommonSetup);

test("should resign keyPane if keyPane", function() {
  pane.becomeKeyPane();
  ok(r.get('keyPane') === pane, 'precond - pane is currently key');

  pane.resignKeyPane();
  ok(r.get('keyPane') !== pane, 'pane should NOT be keyPane');
  equals(pane.get('isKeyPane'), NO, 'isKeyPane should be set to NO');
});

// technically this shouldn't happen, but someone could screw up and change
// acceptsKeyPane to NO once the pane has already become key
test("should still resign if acceptsKeyPane is NO", function() {
  pane.becomeKeyPane();
  ok(r.get('keyPane') === pane, 'precond - pane is currently key');

  pane.acceptsKeyPane = NO ;
  pane.resignKeyPane();
  ok(r.get('keyPane') !== pane, 'pane should NOT be keyPane');
  equals(pane.get('isKeyPane'), NO, 'isKeyPane should be set to NO');
});

test("should invoke willLoseKeyPaneTo & didLoseKeyPaneTo", function() {
  pane.becomeKeyPane();
  ok(r.get('keyPane') === pane, 'precond - pane is currently key');

  var callCount = 0 ;
  pane.willLoseKeyPaneTo = pane.didLoseKeyPaneTo = function() {
    callCount++;
  };

  pane.resignKeyPane();
  equals(callCount, 2, 'should invoke both callbacks');

  callCount = 0;
  pane.resignKeyPane();
  equals(callCount, 0, 'should not invoke callbacks if already key pane');
});

test("should invoke callbacks and update isKeyResponder state on firstResponder", function() {
  var callCount = 0;
  view.willLoseKeyResponderTo = view.didLoseKeyResponderTo =
    function() { callCount++; };

  pane.becomeKeyPane();
  equals(view.get('isKeyResponder'), YES, 'precond - view is keyResponder');
  equals(view.get('isFirstResponder'), YES, 'precond - view is firstResponder');

  pane.resignKeyPane();
  equals(callCount, 2, 'should invoke both callbacks');
  equals(view.get('isKeyResponder'), NO, 'should be keyResponder');
});

