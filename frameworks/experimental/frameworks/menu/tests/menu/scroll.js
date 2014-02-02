// ==========================================================================
// Project:   SC.MenuScrollView Unit Test
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals SC module test ok equals same stop start */
 
var view, pane;
module("Menu Scroll View", {
  setup: function () {
    SC.RunLoop.begin();

    var content = ['Dogfish Head',
                   'Delerium',
                   'Smuttynose',
                   'Harpoon',
                   'Bitburger',
                   'Goose Island',
                   'Old Speckled Hen',
                   'Fuller\'s',
                   'Anchor',
                   'Brooklyn',
                   'Lagunitas',
                   'Coney Island'];

    view = SC.MenuScrollView.create({
      layout: { top: 100, left: 20, height: 100, width: 100 },
      contentView: SC.SourceListView.design({
        content: content
      })
    });

    pane = SC.MainPane.create();
    pane.appendChild(view);
    pane.append();

    SC.RunLoop.end();
  },

  teardown: function () {
    SC.RunLoop.begin();
    pane.remove();
    pane.destroy();
    SC.RunLoop.end();
  }
});

test("menu scroll views cannot scroll horizontally", function () {
  ok(!view.get('hasHorizontalScroller'),
     "the horizontal scroller doesn't exist");
  ok(!view.get('isHorizontalScrollerVisible'),
     "the horizontal scroller shouldn't be visible");
});

test("vertical scroll views cannot scroll horizontally", function () {
  ok(view.get('hasVerticalScroller'),
     "the vertical scroller should exist");
});

test("menu scrollers not visible when content doesn't fill the container", function () {
  SC.RunLoop.begin();
  view.setPath('contentView.content', []);
  SC.RunLoop.end();

  equals(view.getPath('verticalScrollerView.isVisible'), NO,
         "the top vertical scroller shouldn't be visible");
  equals(view.getPath('verticalScrollerView2.isVisible'), NO,
         "the bottom vertical scroller shouldn't be visible");
});

test("initially, only the bottom menu scroller should be visible", function () {
  equals(view.getPath('verticalScrollerView.isVisible'), NO,
         "the top scroller shouldn't be visible");
  equals(view.getPath('verticalScrollerView2.isVisible'), YES,
         "the bottom scroller should be visible");
});

// ..........................................................
// autohidesVerticalScrollers => YES
//

// Top scroller visibility
test("when setting `verticalScrollOffset` to anywhere before the scroller thickness, the top scroller will become invisible", function () {
  view.scrollTo(0, 50);

  ok(view.getPath('verticalScrollerView.isVisible'),
     "top scroller should be visible");

  view.scrollTo(0, view.getPath('verticalScrollerView.scrollerThickness'));
  equals(view.get('verticalScrollOffset'), 0,
         "view should be at 0px scroll offset");
  ok(!view.getPath('verticalScrollerView.isVisible'),
     "top scroller should NOT be visible");

  view.scrollTo(0, 50);
  ok(view.getPath('verticalScrollerView.isVisible'),
     "top scroller should be visible");

  view.scrollTo(0, view.getPath('verticalScrollerView.scrollerThickness') + 1);
  ok(view.getPath('verticalScrollerView.isVisible'),
     "top scroller should be visible");

  view.scrollTo(0, 50);
  ok(view.getPath('verticalScrollerView.isVisible'),
     "top scroller should be visible");

  view.scrollTo(0, view.getPath('verticalScrollerView.scrollerThickness') - 1);
  ok(!view.getPath('verticalScrollerView.isVisible'),
     "top scroller should NOT be visible");
});

// Bottom scroller visibility
test("when setting `verticalScrollOffset` to anywhere before the scroller thickness, the bottom scroller will become invisible", function () {
  var max = view.get('maximumVerticalScrollOffset');
  ok(view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should be visible");

  // @ bottom
  view.scrollTo(0, max);
  ok(!view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should NOT be visible");

  view.scrollTo(0, 0);
  ok(view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should be visible");

  // just enough so bottom is invisible
  view.scrollTo(0, max - view.getPath('verticalScrollerView2.scrollerThickness') - 1);
  ok(view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should be visible");

  view.scrollTo(0, 0);
  ok(view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should be visible");

  // exactly enough for bottom to be invisible
  view.scrollTo(0, max - view.getPath('verticalScrollerView2.scrollerThickness'));
  ok(!view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should NOT be visible");

  view.scrollTo(0, 0);
  ok(view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should be visible");

  // more than enough for bottom to be invisible
  view.scrollTo(0, max - view.getPath('verticalScrollerView2.scrollerThickness') + 1);
  ok(!view.getPath('verticalScrollerView2.isVisible'),
     "bottom scroller should NOT be visible");
});

test("when the top scroller becomes visible, the vertical scroll offset is adjusted by the scroller thickness", function () {
  view.scrollBy(0, 1);

  var thickness = view.getPath('verticalScrollerView.scrollerThickness');

  // check for adjustment
  equals(view.get('verticalScrollOffset'),
         1 + thickness,
         "the offset should be the scroller thickness + 1");

  // shouldn't adjust this time
  view.scrollBy(0, 1);
  equals(view.get('verticalScrollOffset'),
         2 + thickness,
         "the offset should be the scroller thickness + 2");

  // shouldn't adjust this time
  view.scrollBy(0, -1);
  equals(view.get('verticalScrollOffset'),
         1 + thickness,
         "the offset should be the scroller thickness + 1");

  // check for adjustment
  view.scrollBy(0, -1);
  equals(view.get('verticalScrollOffset'), 0,
         "the offset should be 0px");
});

// ..........................................................
// autohidesVerticalScrollers => NO
//

test("when `autohidesVerticalScrollers` is NO, it will hide both when the content doesn't fill the container", function () {
  view.set('autohidesVerticalScrollers', NO);
  view.tile();

  SC.RunLoop.begin();
  view.setPath('contentView.content', []);
  SC.RunLoop.end();

  equals(view.getPath('verticalScrollerView.isVisible'), NO,
         "the top vertical scroller shouldn't be visible");
  equals(view.getPath('verticalScrollerView2.isVisible'), NO,
         "the bottom vertical scroller shouldn't be visible");
});

test("when `autohidesVerticalScrollers` is NO, both scrollers will be shown when the content overflows", function () {
  view.set('autohidesVerticalScrollers', NO);
  view.tile();

  equals(view.getPath('verticalScrollerView.isVisible'), YES,
         "the top vertical scroller shouldn't be visible");
  equals(view.getPath('verticalScrollerView2.isVisible'), YES,
         "the bottom vertical scroller shouldn't be visible");
});

// ..........................................................
// autohidesVerticalScroller  => NO AND
// autohidesVerticalScrollers => NO
//

test("when `autohidesVerticalScroller` is NO, it will NOT hide both when the content doesn't fill the container", function () {
  view.set('autohidesVerticalScroller', NO);
  view.set('autohidesVerticalScrollers', NO);

  SC.RunLoop.begin();
  view.setPath('contentView.content', []);
  SC.RunLoop.end();

  equals(view.getPath('verticalScrollerView.isVisible'), YES,
         "the top vertical scroller shouldn't be visible");
  equals(view.getPath('verticalScrollerView2.isVisible'), YES,
         "the bottom vertical scroller shouldn't be visible");
});

test("when `autohidesVerticalScroller` is NO, both scrollers will be shown when the content overflows", function () {
  view.set('autohidesVerticalScroller', NO);
  view.set('autohidesVerticalScrollers', NO);
  view.tile();

  equals(view.getPath('verticalScrollerView.isVisible'), YES,
         "the top vertical scroller shouldn't be visible");
  equals(view.getPath('verticalScrollerView2.isVisible'), YES,
         "the bottom vertical scroller shouldn't be visible");
});
