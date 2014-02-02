// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test htmlbody ok equals same stop start */


module("SC.ProgressView Methods", {
  setup: function() {
    SC.RunLoop.begin();
    pane = SC.MainPane.create({
      childViews: [
        SC.ProgressView.extend({
          value: 25,
          minimum: 0,
          maximum: 100
        })]
    });
    pane.append(); // make sure there is a layer...
    SC.RunLoop.end();

    view = pane.childViews[0];
  },

  teardown: function() {
    pane.remove();
    pane = view = null ;
  }
});

test("changing a progress view value to maximum", function() {
  equals(view.get('value'), 25, 'precon - value should be 25');
  equals(view.get('isIndeterminate'), NO, 'precon - value should be NO');
  equals(view.get('isRunning'), NO, 'precon - value should be NO');
  equals(view.get('isEnabled'), YES, 'precon - value should be YES');

  SC.RunLoop.begin();
  view.set('value', 100);
  SC.RunLoop.end();

  equals(view.get('value'), 100, 'should be 100');
});

test("changing value of a disabled progress view", function() {
  equals(view.get('value'), 25, 'precon - value should be 25');
  equals(view.get('isEnabled'), YES, 'precon - value should be YES');

  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  view.set('value', 100);
  SC.RunLoop.end();

  // changing while disabled is allowed
  equals(view.get('value'), 100, 'should be 100');
});
