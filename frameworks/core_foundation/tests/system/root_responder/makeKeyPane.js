// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody */
module("SC.RootResponder#makeKeyPane");

test("returns receiver", function() {
  var p1 = SC.Pane.create(), p2 = SC.Pane.create({ acceptsKeyPane: YES });
  var r = SC.RootResponder.create();
  
  equals(r.makeKeyPane(p1), r, 'returns receiver even if pane does not accept key pane');
  equals(r.makeKeyPane(p2), r, 'returns receiver');
});

test("changes keyPane to new pane if pane accepts key focus", function() {
  var p1 = SC.Pane.create({ acceptsKeyPane: NO }) ;
  var p2 = SC.Pane.create({ acceptsKeyPane: YES });
  var r = SC.RootResponder.create();
  
  r.makeKeyPane(p1);
  ok(r.get('keyPane') !== p1, 'keyPane should not change to view that does not accept key');

  r.makeKeyPane(p2);
  equals(r.get('keyPane'), p2, 'keyPane should change to view that does accept key');
  
});

test("setting nil sets key pane to mainPane if mainPane accepts key focus", function() {
  var main = SC.Pane.create({ acceptsKeyPane: YES });
  var key = SC.Pane.create({ acceptsKeyPane: YES });
  var r = SC.RootResponder.create({ mainPane: main, keyPane: key });
  
  // try to clear keyPane -- mainPane accepts key
  r.makeKeyPane(null);
  equals(r.get('keyPane'), main, 'keyPane should be main pane');
  
  r.makeKeyPane(key); // reset
  main.acceptsKeyPane = NO ;
  r.makeKeyPane(null); // try to clean - mainPane does not accept key
  equals(r.get('keyPane'), null, 'keyPane should be null, not main');
  
  // try another variety.  if keyPane is currently null and we try to set to
  // null do nothing, even if main DOES accept key.
  r.keyPane = null ;
  main.acceptsKeyPane = NO;
  r.makeKeyPane(null);
  equals(r.get('keyPane'), null, 'keyPane should remain null');
});

var p1, p2, r, callCount ;
module("SC.RootResponder#makeKeyPane - testing notifications", {
  setup: function() {
    p1 = SC.Pane.create({ acceptsKeyPane: YES });    
    p2 = SC.Pane.create({ acceptsKeyPane: YES });    
    r = SC.RootResponder.create();
    callCount = 0 ;
  },
  
  teardown: function() { p1 = p2 = r ; }
});

test("should call willLoseKeyPaneTo on current keyPane", function() {
  r.keyPane = p1; //setup test
  p1.willLoseKeyPaneTo = function(pane) {
    equals(pane, p2, 'should pass new pane');
    callCount++;
  };
  
  r.makeKeyPane(p2);
  equals(callCount, 1, 'should invoke');
});

test("should call willBecomeKeyPaneFrom on new keyPane", function() {
  r.keyPane = p1; //setup test
  p2.willBecomeKeyPaneFrom = function(pane) {
    equals(pane, p1, 'should pass old pane');
    callCount++;
  };
  
  r.makeKeyPane(p2);
  equals(callCount, 1, 'should invoke');
});


test("should call didLoseKeyPaneTo on old keyPane", function() {
  r.keyPane = p1; //setup test
  p1.didLoseKeyPaneTo = function(pane) {
    equals(pane, p2, 'should pass new pane');
    callCount++;
  };
  
  r.makeKeyPane(p2);
  equals(callCount, 1, 'should invoke');
});

test("should call didBecomeKeyPaneFrom on new keyPane", function() {
  r.keyPane = p1; //setup test
  p2.didBecomeKeyPaneFrom = function(pane) {
    equals(pane, p1, 'should pass old pane');
    callCount++;
  };
  
  r.makeKeyPane(p2);
  equals(callCount, 1, 'should invoke');
});

test("should not invoke callbacks if setting keyPane to itself", function() {
  r.keyPane = p1; //setup test
  // instrument ...
  p1.didLoseKeyPaneTo = p1.willLoseKeyPaneTo = p1.willBecomeKeyPaneFrom = p1.didBecomeKeyPaneFrom = function() { callCount++; };
  
  r.makeKeyPane(p1);
  equals(callCount, 0, 'did not invoke any callbacks');
});







