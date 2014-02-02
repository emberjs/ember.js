// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals, ok */

var view;

/** Test the SC.View states. */
module("SC.View:childViewLayout", {

  setup: function () {
    view = SC.View.create();
  },

  teardown: function () {
    view.destroy();
    view = null;
  }

});

test("basic VERTICAL_STACK", function () {
  SC.run(function() {
    view = SC.View.create({

      childViewLayout: SC.View.VERTICAL_STACK,

      childViewLayoutOptions: {
        paddingBefore: 10,
        paddingAfter: 20,
        spacing: 5
      },
      childViews: ['sectionA', 'sectionB', 'sectionC'],
      layout: { left: 10, right: 10, top: 20 },
      sectionA: SC.View.design({
        layout: { height: 100 }
      }),

      sectionB: SC.View.design({
        layout: { border: 1, height: 50 }
      }),

      sectionC: SC.View.design({
        layout: { left: 10, right: 10, height: 120 }
      })

    });
  });

  equals(view.sectionA.layout.top, 10, "sectionA top should be 10");
  equals(view.sectionB.layout.top, 115, "sectionB top should be 115");
  equals(view.sectionC.layout.top, 170, "sectionC top should be 170");
  equals(view.layout.height, 310, "view height should be 310");

});

test("basic HORIZONTAL_STACK", function () {
  SC.run(function() {
    view = SC.View.create({
      childViewLayout: SC.View.HORIZONTAL_STACK,
      childViewLayoutOptions: {
        paddingBefore: 10,
        paddingAfter: 20,
        spacing: 5
      },
      childViews: ['sectionA', 'sectionB', 'sectionC'],
      layout: { left: 10, bottom: 20, top: 20 },

      sectionA: SC.View.design({
        layout: { width: 100 }
      }),

      sectionB: SC.View.design({
        layout: { border: 1, width: 50 }
      }),

      sectionC: SC.View.design({
        layout: { top: 10, bottom: 10, width: 120 }
      })
    });
  });

  equals(view.sectionA.layout.left, 10, "sectionA left should be 10");
  equals(view.sectionB.layout.left, 115, "sectionB left should be 115");
  equals(view.sectionC.layout.left, 170, "sectionC left should be 170");
  equals(view.layout.width, 310, "view width should be 310");

});
