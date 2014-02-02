// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            portions copyright ©2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global equals, module, test */

/*
  Tests SplitView Child logic. This covers properties which are interpreted
  by the SplitChild mixin itself—not the properties used by the SplitView.

  As such, we look at:

  - layout
  - positionOffset
  - sizeOffset
  - splitChildLayoutDidChange
  - splitView calculation
  - splitViewLayoutDirection property

  All tests are run twice: once in horizontal, once in vertical.
*/


var pane, splitView;

function setupSuite(layoutDirection) {
  module("SplitView - SplitChild (" + (layoutDirection === SC.LAYOUT_HORIZONTAL ? "HORIZONTAL" : "VERTICAL") + ")", {

    setup: function () {
      SC.run(function () {
        splitView = SC.SplitView.create({
          childViews: [ 'left', 'middle', 'right' ],

          left:  SC.View.extend(SC.SplitChild, { name: 'left', size: 100 }),

          middle: SC.View.extend(SC.SplitChild, { name: 'middle', size: 300, positionOffset: -10, sizeOffset: 20 }),

          right: SC.SplitView.extend(SC.SplitChild, {
            name: 'right',
            size: 100,
            splitDividerView: null,
            childViews: ['top', 'bottom'],
            top: SC.View.extend(SC.SplitChild, { name: 'top', size: 100 }),
            bottom: SC.View.extend(SC.SplitChild, { name: 'bottom', size: 400 })
          }),

          layout: {
            left: 0,
            top: 0,
            width: layoutDirection === SC.LAYOUT_HORIZONTAL ? 500 : 300,
            height: layoutDirection === SC.LAYOUT_HORIZONTAL ? 300 : 500
          },

          layoutDirection: layoutDirection,

          splitDividerView: null // in most of these tests, we are not checking the behavior of split dividers

        });

        pane = SC.Pane.create({
          childViews: [splitView]
        });
        pane.append();
      });
    },

    teardown: function () {
      pane.destroy();
      pane = splitView = null;
    }
  });

  function verifyChildren(view) {
    var pos = 0;

    for (var i = 1; i < arguments.length; i++) {
      var child = view.childViews[i - 1];

      equals(child.get('position'), pos, "Correct position for view " + i);
      equals(child.get('size'), arguments[i], "Correct size for view " + i);

      var cpos = pos + child.get('positionOffset');
      var csize = arguments[i] + child.get('sizeOffset');
      var layout = child.get('layout');

      // check layout, and consider offset
      if (splitView.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
        equals(layout.left, cpos, "Correct left for view " + i);
        equals(layout.width, csize, "Correct width for view " + i);

        equals(layout.top, 0, "Top is 0 in LAYOUT_HORIZONTAL");
        equals(layout.bottom, 0, "Bottom is 0 in LAYOUT_HORIZONTAL");
      } else {
        equals(layout.top, cpos, "Correct top for view " + i);
        equals(layout.height, csize, "Correct height for view " + i);

        equals(layout.left, 0, "Left is 0 in LAYOUT_VERTICAL");
        equals(layout.right, 0, "Right is 0 in LAYOUT_VERTICAL");
      }

      pos += arguments[i];
    }
  }

  test("Layout gets applied correctly for child views.", function () {
    verifyChildren(splitView, 100, 300, 100);

    // double-check the position/sizeOffset
    var cv = splitView.get('childViews');
    equals(cv[1].get('positionOffset'), -10, "Middle child has proper position offset");
    equals(cv[1].get('sizeOffset'), 20, "Middle child has proper size offset");

    if (layoutDirection === SC.LAYOUT_HORIZONTAL) {
      equals(cv[1].get('layout').left, 90, "Middle child has proper (offsetted) position in layout");
      equals(cv[1].get('layout').width, 320, "Middle child has proper (offsetted) size in layout");
    } else {
      equals(cv[1].get('layout').top, 90, "Middle child has proper (offsetted) position in layout");
      equals(cv[1].get('layout').height, 320, "Middle child has proper (offsetted) size in layout");
    }

  });

  test("Check that layout adjusts after adjusting child view position", function () {
    SC.RunLoop.begin();
    splitView.adjustPositionForChild(splitView.childViews[1], 200);
    SC.RunLoop.end();

    verifyChildren(splitView, 200, 200, 100);
  });

  test("Check that changing orientation changes layouts.", function () {
    equals(splitView.get('layoutDirection'), layoutDirection);

    var childLayoutDirection = splitView.childViews[0].get('splitViewLayoutDirection');
    equals(childLayoutDirection, layoutDirection, "Child has correct layout direction before orientation change.");

    var newLayoutDirection = layoutDirection === SC.LAYOUT_HORIZONTAL ? SC.LAYOUT_VERTICAL : SC.LAYOUT_HORIZONTAL;

    SC.run(function () {
      splitView.set('layoutDirection', newLayoutDirection);
    });

    equals(splitView.get('layoutDirection'), newLayoutDirection);

    childLayoutDirection = splitView.childViews[0].get('splitViewLayoutDirection');
    equals(childLayoutDirection, newLayoutDirection, "Child has correct layout direction after orientation change.");

    // height is different, so layout should have changed to 100, 100, 100
    verifyChildren(splitView, 100, 100, 100);
  });

  test("Check that the `splitView` computed is correct on SC.SplitChilds", function () {
    equals(splitView, splitView.childViews[0].get('splitView'));
    equals(splitView, splitView.childViews[1].get('splitView'));
    equals(splitView, splitView.childViews[2].get('splitView'),
           'the splitView should the closest parent splitView');

    var nestedSplitView = splitView.childViews[2];

    equals(nestedSplitView, nestedSplitView.childViews[0].get('splitView'));
    equals(nestedSplitView, nestedSplitView.childViews[1].get('splitView'));
  });

}

setupSuite(SC.LAYOUT_HORIZONTAL);
setupSuite(SC.LAYOUT_VERTICAL);
