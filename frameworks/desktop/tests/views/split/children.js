// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            portions copyright ©2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  Tests SplitView logic responsible for managing child views; specifically,
  these properties that are added to the child views:

  - nextView
  - previousView
  - viewIndex

  We don't have to worry about orientation; the code being tested creates
  child views, but does nothing related to laying them out.

  We _do_ test these properties with dividers as well.
*/
var splitView;
module("SplitView - Child Management", {
  setup: function() {
    SC.RunLoop.begin();
    splitView = SC.SplitView.create({
      childViews: [ 'left', 'middle', 'right' ],

      left:  SC.View.extend(SC.SplitChild, { name: 'left', canCollapse: YES, collapseAtSize: 50 }),
      middle: SC.View.extend(SC.SplitChild, { name: 'middle' }),
      right: SC.View.extend(SC.SplitChild, { name: 'right', canCollapse: YES, collapseAtSize: 50 }),

      layout: { left: 0, top: 0, width: 500, height: 500 },

      splitDividerView: null // in most of these tests, we are not checking the behavior of split dividers
    });
    SC.RunLoop.end();
  }
});

function validateChildren(view, expected) {
  equals(view.childViews.length, expected, "Should have " + expected + " child views");

  var prev = null;
  for (var i = 0; i < view.childViews.length; i++) {
    equals(view.childViews[i].viewIndex, i, "View index should be " + i);
    equals(view.childViews[i].previousView, prev, "Should have proper previous view");

    var next = null;
    if (view.childViews.length > i + 1) {
      next = view.childViews[i+1];
    }

    equals(view.childViews[i].nextView, next, "Should have proper next view");
    prev = view.childViews[i];
  }
}

test("Initial settings correct", function() {
  validateChildren(splitView, 3);
});

test("Adding a child view doesn't disturb things", function() {
  var add = SC.View.create(SC.SplitChild, { name: 'add' });

  SC.RunLoop.begin();
  splitView.appendChild(add);
  SC.RunLoop.end();

  validateChildren(splitView, 4);
});

test("Inserting a child view doesn't disturb things", function() {
  var add = SC.View.create(SC.SplitChild, { name: 'add' });

  SC.RunLoop.begin();
  splitView.insertBefore(add, splitView.childViews[0]);
  SC.RunLoop.end();

  validateChildren(splitView, 4);
});

test("Removing a child view doesn't disturb things", function() {
  SC.RunLoop.begin();
  splitView.removeChild(splitView.childViews[0]);
  SC.RunLoop.end();

  validateChildren(splitView, 2);
});

test("Works with dividers", function() {
  var add = SC.View.create(SC.SplitChild, { name: 'add' });

  splitView.splitDividerView = SC.SplitDividerView;

  SC.RunLoop.begin();
  splitView.appendChild(add);
  SC.RunLoop.end();

  validateChildren(splitView, 7);
});

test("Destroying the split view with dividers doesn't break things", function() {
  var add = SC.View.create(SC.SplitChild, { name: 'add' });

  splitView.splitDividerView = SC.SplitDividerView;

  SC.RunLoop.begin();
  splitView.appendChild(add); // trigger _scsv_setupChildViews
  SC.RunLoop.end();

  try {
    SC.RunLoop.begin();
    splitView.destroy();
    SC.RunLoop.end();
    ok(true, "No error was thrown");
  } catch(e) {
    ok(false, "An error was thrown - " + e);
  }
});
