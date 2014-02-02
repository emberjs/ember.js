// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// View metrics Unit Tests
// ========================================================================
/*global module, test, ok, equals */

/**
  These tests verify that all view metrics -- frame, clippingFrame,
  isVisibleInWindow, etc. are correct.
*/

// ..........................................................
// BASE TESTS
//
// These tests exercise the API.  See below for tests that cover edge
// conditions.  If you find a bug, we recommend that you add a test in the
// edge case section.

var pane, view; // test globals

module("isVisibleInWindow", {

  setup: function () {
    pane = SC.MainPane.create();
    pane.append();
    view = SC.View.create();
  },

  teardown: function () {
    view.destroy();
    pane.remove().destroy();
    pane = null;
  }

});

test("a new view should not be visible initially", function () {
  ok(!view.get('isVisibleInWindow'), "view.get('isVisibleInWindow') === NO");
});

test("adding a new view to a visible pane should make it visible", function () {
  ok(!view.get('isVisibleInWindow'), "view.get('isVisibleInWindow') === NO");
  ok(pane.get('isVisibleInWindow'), "pane.get('isVisibleInWindow') === YES");

  pane.appendChild(view);
  ok(view.get('isVisibleInWindow'), "after pane.appendChild(view), view.get('isVisibleInWindow') === YES");
});

test("removing a view from a visible pane should make it invisible again", function () {
  ok(!view.get('isVisibleInWindow'), "view.get('isVisibleInWindow') === NO");
  ok(pane.get('isVisibleInWindow'), "pane.get('isVisibleInWindow') === YES");
  pane.appendChild(view);
  ok(view.get('isVisibleInWindow'), "after pane.appendChild(view), view.get('isVisibleInWindow') === YES");

  view.removeFromParent();
  ok(!view.get('isVisibleInWindow'), "after view.removeFromParent(), view.get('isVisibleInWindow') === NO");
});

// .......................................................
// integration with updateLayer and layoutChildViews
//
test("_executeDoUpdateContent should not be invoked even if layer becomes dirty until isVisibleInWindow changes, then it should invoke", function () {

  var callCount = 0;
  view._executeDoUpdateContent = function () {
    SC.View.prototype._executeDoUpdateContent.apply(this, arguments);
    callCount++;
  };
  ok(!view.get('isVisibleInWindow'), 'precond - view should not be visible to start');

  SC.run(function () {
    view.displayDidChange();
  });
  equals(callCount, 0, '_executeDoUpdateContent should not run b/c it\'s not visible');

  view.set('isVisible', false);

  SC.run(function () {
    pane.appendChild(view); // Attach the view.
    view.displayDidChange();
  });
  equals(callCount, 0, '_executeDoUpdateContent should not run b/c it\'s not visible');

  SC.run(function () {
    view.set('isVisible', true);
    ok(view.get('isVisibleInWindow'), 'view should now be visible in window');
  });
  equals(callCount, 1, '_executeDoUpdateContent should exec now b/c the view is visible');
});

test("_doUpdateLayoutStyle should not be invoked even if layer needs layout until isVisibleInWindow changes, then it should invoke", function () {

  var child = SC.View.create();
  view.appendChild(child);

  var callCount = 0;
  child._doUpdateLayoutStyle = function () { callCount++; };
  ok(!view.get('isVisibleInWindow'), 'precond - view should not be visible to start');

  SC.run(function () {
    child.layoutDidChange();
  });

  equals(callCount, 0, '_doUpdateLayoutStyle should not run b/c its not shown');

  view.set('isVisible', false);

  SC.run(function () {
    pane.appendChild(view); // Attach the view.
    child.layoutDidChange();
  });
  equals(callCount, 0, '_doUpdateLayoutStyle should not run b/c its not shown');

  SC.run(function () {
    view.set('isVisible', true);
    ok(view.get('isVisibleInWindow'), 'view should now be visible in window');
  });
  equals(callCount, 1, '_doUpdateLayoutStyle should exec now b/c the child was appended to a shown parent');
});

test("setting isVisible to NO should trigger a layer update to hide the view", function () {

  SC.RunLoop.begin();
  pane.appendChild(view);
  SC.RunLoop.end();

  SC.RunLoop.begin();
  view.set('isVisible', NO);
  SC.RunLoop.end();

  ok(view.renderContext(view.get('layer')).classes().indexOf('sc-hidden') >= 0, "layer should have the 'sc-hidden' class");
});
