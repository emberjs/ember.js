// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            portions copyright ©2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global equals, module, test */

/*
  Tests SplitView methods; specifically, the API that users of SplitView use
  (not the methods that they may override).

  The methods tested are:

  - getPositionForChild
  - adjustPositionForChild

  They are tested in several different ways, with child views configured in many
  different ways.

  We also run the entire test suite twice: once in each orientation. The numbers should
  be the same either way. In the ui tests, we test that they get applied properly.
*/

function setupTestSuite(layoutDirection) {

  var splitView, left, right, middleLeft, middleRight;

  module(
    "SplitView " +
    (layoutDirection === SC.HORIZONTAL_LAYOUT ? "Horizontal" : "Vertical") +
    " - Methods",
    {
    setup: function () {
      SC.RunLoop.begin();
      // we test with no split divider because we want to easily calculate layout.
      splitView = SC.SplitView.create({
        childViews: [
          SC.View.create(SC.SplitChild, { canCollapse: YES, collapseAtSize: 50 }),
          SC.View.create(SC.SplitChild, { canCollapse: YES, collapseAtSize: 50 })
        ],

        layout: { left: 0, top: 0, width: 500, height: 500 },

        layoutDirection: layoutDirection,

        splitDividerView: null
      });

      SC.RunLoop.end();

      left = splitView.childViews[0];
      right = splitView.childViews[1];
    },

    teardown: function () {

    }
  });

  test("Initial positions are correct", function () {
    equals(splitView.childViews.length, 2, "SplitView has 2 children");
    equals(splitView.getPositionForChild(left), 0, "Left should always be at 0");
    equals(splitView.getPositionForChild(right), 250, "Right should be at 1/2: 50");
  });

  test("Can adjust position for a child", function () {
    var result = splitView.adjustPositionForChild(right, 100);
    equals(result, 100, "Result of adjustPositionForChild(right, 100)");
    equals(left.get('position'), 0, "Left position (should always be 0)");
    equals(left.get('size'), 100, "Left size");
    equals(right.get('position'), 100, "Right position");
    equals(right.get('size'), 400, "Right size");
  });


  test("SplitView - Methods: Minimum and Maximum widths and heights", function () {
    // first, test with the built-in minimum size
    var result = splitView.adjustPositionForChild(right, 80);
    equals(result, 100, "Result of adjustPositionForChild(right, 80)");
    equals(left.get('position'), 0, "Left position (should always be 0)");
    equals(left.get('size'), 100, "Left size");
    equals(right.get('position'), 100, "Right position");
    equals(right.get('size'), 400, "Right size");

    // now, add a max and test that
    left.set('maximumSize', 150);

    result = splitView.adjustPositionForChild(right, 180);
    equals(result, 150, "Result of adjustPositionForChild(right, 180) when left's max size = 150");
    equals(left.get('position'), 0, "Left position (should always be 0)");
    equals(left.get('size'), 150, "Left size");
    equals(right.get('position'), 150, "Right position");
    equals(right.get('size'), 350, "Right size");

    // and now go back to middle
    result = splitView.adjustPositionForChild(right, 130);
    equals(result, 130, "Result of adjustPositionForChild(right, 130) when left's max size = 150");
    equals(left.get('position'), 0, "Left position (should always be 0)");
    equals(left.get('size'), 130, "Left size");
    equals(right.get('position'), 130, "Right position");
    equals(right.get('size'), 370, "Right size");
  });

  test("SplitView - Methods: Collapsing a child", function () {
    var result = splitView.adjustPositionForChild(right, 40);

    // first was collapsed, so position of seconds is now at 0.
    equals(result, 0, "Result of adjustPositionForChild(right, 40)");
    equals(left.get('position'), 0, "Left position (should always be 0)");
    equals(left.get('size'), 0, "Left size after collapsing");
    equals(right.get('position'), 0, "Right position");
    equals(right.get('size'), 500, "Right size");
  });


  module(
    "SplitView 4-pane " +
    (layoutDirection === SC.HORIZONTAL_LAYOUT ? "Horizontal" : "Vertical") +
    " - Methods",
    {
    setup: function () {
      SC.RunLoop.begin();
      // we test with no split divider because we want to easily calculate layout.
      splitView = SC.SplitView.create({
        childViews: [
          SC.View.create(SC.SplitChild, { canCollapse: YES, collapseAtSize: 50, autoResizeStyle: SC.RESIZE_MANUAL }),
          SC.View.create(SC.SplitChild, { autoResizeStyle: SC.RESIZE_AUTOMATIC }),
          SC.View.create(SC.SplitChild, { autoResizeStyle: SC.RESIZE_AUTOMATIC }),
          SC.View.create(SC.SplitChild, { autoResizeStyle: SC.FIXED_SIZE, canCollapse: YES, collapseAtSize: 50 })
        ],

        layout: { left: 0, top: 0, width: 800, height: 800 },

        layoutDirection: layoutDirection,

        splitDividerView: null
      });

      SC.RunLoop.end();

      left = splitView.childViews[0];
      middleLeft = splitView.childViews[1];
      middleRight = splitView.childViews[2];
      right = splitView.childViews[3];
    }
  });

  function confirmPositions() {
    for (var i = 0; i < arguments.length; i++) {
      equals(splitView.childViews[i].get('position'), arguments[i]);
    }
  }

  test("Initial positions are correct", function () {
    // the left and right sides do not resize unless forced to; as such, they
    // stay at 100.
    confirmPositions(0, 100, 400, 700);
  });

  test("Repositioning handles indirectness", function () {
    var result;

    // moving within available space works
    result = splitView.adjustPositionForChild(middleLeft, 200);
    equals(result, 200, "Moved to target position successfully.");
    confirmPositions(0, 200, 400, 700);

    // indirect being turned off for the next view, moving past min size
    // for middleLeft should still work because it is an immediate sibling
    result = splitView.adjustPositionForChild(middleLeft, 400);
    equals(result, 400, "Moved to 400");
    confirmPositions(0, 400, 500, 700);

    // moving so far as to move the fourth view, however, should not work (it is fixed size)
    result = splitView.adjustPositionForChild(middleLeft, 700);
    equals(result, 500, "Limited to 500 due to minimum sizes and because last cannot move.");
    confirmPositions(0, 500, 600, 700);

    // changing last from fixed should not allow it through if indirect is not allowed
    right.set('autoResizeStyle', SC.RESIZE_AUTOMATIC);
    right.set('allowsIndirectAdjustments', NO);

    result = splitView.adjustPositionForChild(middleLeft, 700);
    equals(result, 500, "Limited to 500 due to minimum sizes and because last cannot move.");
    confirmPositions(0, 500, 600, 700);

    // but it should work if indirect _is_ allowed (rightmost should collapse)
    right.set('allowsIndirectAdjustments', YES);

    result = splitView.adjustPositionForChild(middleLeft, 700);
    equals(result, 600, "Limited to 600 due to minimum sizes and because last collapses.");
    confirmPositions(0, 600, 700, 800);
  });

  test("Repositioning without compensation", function () {
    // first, disable all compensation
    left.set('compensatesForMovement', NO);
    middleLeft.set('compensatesForMovement', NO);
    middleRight.set('compensatesForMovement', NO);
    right.set('compensatesForMovement', NO);

    var result;

    // repositioning middle-left should fail because rightmost can't move.
    result = splitView.adjustPositionForChild(middleLeft, 800);
    equals(result, 100, "Failed to move to target because compensation is off.");
    confirmPositions(0, 100, 400, 700);

    // turning compensation on for second-to-right makes _it_ move to max
    middleRight.set('compensatesForMovement', YES);
    result = splitView.adjustPositionForChild(middleLeft, 800);
    equals(result, 300, "Moved to min width of middleRight");
    confirmPositions(0, 300, 600, 700);
  });

  test("Resizing split view", function () {
    SC.RunLoop.begin();
    // note: we test both horizontal and vertical
    splitView.adjust('width', 1600);
    splitView.adjust('height', 1600);
    SC.RunLoop.end();

    // should have resized the auto resizable parts
    confirmPositions(0, 100, 800, 1500);

    // manually resize left part; we're going to test that, when it gets small enough,
    // even the RESIZE_MANUAL will change sizes
    splitView.adjustPositionForChild(middleLeft, 300);

    // so now, just to be clear, the positions should be:
    confirmPositions(0, 300, 800, 1500);

    // so, if we now resize to _really really tiny_
    SC.RunLoop.begin();
    splitView.adjust('width', 400);
    splitView.adjust('height', 400);
    SC.RunLoop.end();

    // we should see that even the RESIZE_MANUAL has resized.
    confirmPositions(0, 100, 200, 300);

    // and if we shrink further still...
    SC.RunLoop.begin();
    splitView.adjust('width', 300);
    splitView.adjust('height', 300);
    SC.RunLoop.end();

    // there should be change, because the left side collapses.
    confirmPositions(0, 0, 100, 200);

    // and if we shrink further still...
    SC.RunLoop.begin();
    splitView.adjust('width', 200);
    splitView.adjust('height', 200);
    SC.RunLoop.end();

    // there should be no change
    confirmPositions(0, 0, 100, 200);

    // and if we shrink further still, way beyond the smallest it can get...
    SC.RunLoop.begin();
    splitView.adjust('width', 100);
    splitView.adjust('height', 100);
    SC.RunLoop.end();

    // there should be no change
    confirmPositions(0, 0, 100, 200);
  });

  test("Fitting to fill disabled", function () {
    splitView.set('shouldResizeChildrenToFit', NO);

    // so, first thing: Resize, and ensure things are where they started.
    SC.RunLoop.begin();
    // note: we test both horizontal and vertical
    splitView.adjust('width', 1600);
    splitView.adjust('height', 1600);
    SC.RunLoop.end();

    confirmPositions(0, 100, 400, 700);

    // now, move one, and see that compensation, etc. still works properly
    splitView.adjustPositionForChild(middleLeft, 500);
    confirmPositions(0, 500, 600, 700);

    // move back, and make sure compensation still took effect
    splitView.adjustPositionForChild(middleLeft, 100);
    confirmPositions(0, 100, 600, 700);

    // disable compensation and move again
    middleLeft.set('compensatesForMovement', NO);
    middleRight.set('compensatesForMovement', NO);
    right.set('compensatesForMovement', NO);

    splitView.adjustPositionForChild(middleLeft, 500);
    confirmPositions(0, 500, 1000, 1100);

    // disable indirect for last item and check that movement cannot occur
    right.set('allowsIndirectAdjustments', NO);

    var result = splitView.adjustPositionForChild(middleLeft, 700);
    equals(result, 500, "Should not be able to move (last does not allow indirect adjustments)");
    confirmPositions(0, 500, 1000, 1100);

    result = splitView.adjustPositionForChild(middleLeft, 200);
    equals(result, 500, "Should not be able to move (last does not allow indirect adjustments)");
    confirmPositions(0, 500, 1000, 1100);
  });

}

setupTestSuite(SC.LAYOUT_HORIZONTAL);
setupTestSuite(SC.LAYOUT_VERTICAL);
