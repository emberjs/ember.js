// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module, test, same, CoreTest */


var scrollView, view;

module("SC.GridView", {
  setup: function () {

    SC.run(function () {
      view = SC.GridView.create({
        columnWidth: 100,

        content: "a b c d e f".w().map(function (x) {
          return SC.Object.create({ title: x });
        }),

        // ..........................................................
        // STUB: itemViewForContentIndex
        //
        itemViewForContentIndex: CoreTest.stub('itemViewForContentIndex', SC.GridView.prototype.itemViewForContentIndex),

        layout: { minWidth: 200 },

        // ..........................................................
        // STUB: layoutForContentIndex
        //
        layoutForContentIndex: CoreTest.stub('layoutForContentIndex', SC.GridView.prototype.layoutForContentIndex),

        // ..........................................................
        // STUB: adjustLayout
        //
        adjustLayout: CoreTest.stub('adjustLayout', SC.CollectionView.prototype.adjustLayout)

      });

      scrollView = SC.ScrollView.create({
        contentView: view,

        layout: { centerX: 0, centerY: 0, height: 400, width: 200 }
      });
    });

  },

  teardown: function () {
    view = scrollView = null;
  }
});


/**
  GridView used to position items according to its clippingFrame, which meant
  that a GridView could not specify a frame width in order to scroll
  horizontally.  This also manifested in a bug where itemsPerRow was based on
  frame but clippingFrame would change first so that GridView's would not
  update properly when clippingFrame changed and frame did not change.  For
  example during a rotation on an iPad.
*/
test("GridView items should be positioned according to frame", function () {
  var layout,
    expectedLayout;

  layout = view.layoutForContentIndex(0);
  expectedLayout = { left: 0, top: 0, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of first item should be");

  layout = view.layoutForContentIndex(1);
  expectedLayout = { left: 100, top: 0, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of second item should be");

  layout = view.layoutForContentIndex(2);
  expectedLayout = { left: 0, top: 48, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of third item should be");

  layout = view.layoutForContentIndex(3);
  expectedLayout = { left: 100, top: 48, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of fourth item should be");

  SC.RunLoop.begin();
  scrollView.adjust('width', 100);
  SC.RunLoop.end();

  layout = view.layoutForContentIndex(0);
  expectedLayout = { left: 0, top: 0, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of first item should be");

  layout = view.layoutForContentIndex(1);
  expectedLayout = { left: 100, top: 0, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of second item should be");

  layout = view.layoutForContentIndex(2);
  expectedLayout = { left: 0, top: 48, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of third item should be");

  layout = view.layoutForContentIndex(3);
  expectedLayout = { left: 100, top: 48, height: 48, width: 100 };
  same(layout, expectedLayout, "Layout of fourth item should be");
});


/*
  GridView would adjust all of its item views every time that its frame
  changed (which happens on scroll), which was very wasteful.  Instead, it was
  improved to only reposition the nowShowing item views, which improved the
  efficiency and also allowed the content to be sparse.  Finally, since the
  position of the item views is only effected by changes to the frame's
  width and not its x, y or height properties.  We can optimize it further to
  only adjust item views when the width is different.
*/
test("Optimized re-position of item views when the frame changes.", function () {
  view.itemViewForContentIndex.expect(0);
  view.layoutForContentIndex.expect(0);

  SC.RunLoop.begin();
  view.notifyPropertyChange('frame');
  SC.RunLoop.end();

  view.itemViewForContentIndex.expect(0);
  view.layoutForContentIndex.expect(0);

  SC.RunLoop.begin();
  view.adjust('height', 500);
  SC.RunLoop.end();

  view.itemViewForContentIndex.expect(0);
  view.layoutForContentIndex.expect(0);

  SC.RunLoop.begin();
  view.adjust('width', 400);
  SC.RunLoop.end();

  // Six item requests, twelve layout requests
  view.itemViewForContentIndex.expect(6);
  view.layoutForContentIndex.expect(12);
});


/**
  GridView used to not re-compute its layout when the frame changed, which meant
  that if the itemsPerRow changed the calculated height of the grid would not
  update to fit the new number of rows.
*/
test("Adjusts layout when the itemsPerRow changes.", function () {
  view.adjustLayout.expect(1);

  SC.RunLoop.begin();
  view.notifyPropertyChange('frame');
  SC.RunLoop.end();

  view.adjustLayout.expect(1);

  SC.RunLoop.begin();
  view.adjust('height', 500);
  SC.RunLoop.end();

  view.adjustLayout.expect(1);

  SC.RunLoop.begin();
  view.adjust('width', 400);
  SC.RunLoop.end();

  view.adjustLayout.expect(2);
});
