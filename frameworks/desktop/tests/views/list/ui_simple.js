// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  This test evaluates a plain list with no custom row heights, outlines,
  group views or any other non-standard behavior.
*/


// create a fake content array.  Generates a list with whatever length you
// want of objects with a title based on the index.  Cannot mutate.
var ContentArray = SC.Object.extend(SC.Array, {

  length: 0,

  objectAt: function(idx) {
    if (idx >= this.get('length')) return undefined;

    var content = this._content, ret ;
    if (!content) content = this._content = [];

    ret = content[idx];
    if (!ret) {
      ret = content[idx] = SC.Object.create({
        title: "ContentItem %@".fmt(idx),
        isDone: (idx % 3)===0,
        unread: (Math.random() > 0.5) ? Math.floor(Math.random() * 100) : 0
      });
    }

    return ret ;
  }
});

var pane = SC.ControlTestPane.design()
  .add("basic", SC.ScrollView.design({
    borderStyle: SC.BORDER_NONE,
    layout: { left: 0, right: 0, top: 0, height: 300 },
    hasHorizontalScroller: NO,
    contentView: SC.ListView.design({
      content: ContentArray.create({ length: 20001 }),
      contentValueKey: "title",
      contentCheckboxKey: "isDone",
      contentUnreadCountKey: "unread",
      rowHeight: 20

    })
  }));

function verifyChildViewsMatch(views, set) {
  var indexes = set.clone();
  views.forEach(function(view) {
    var idx = view.contentIndex ;
    if (indexes.contains(idx)) {
      ok(YES, "should find childView for contentIndex %@ (nowShowing=%@)".fmt(idx, set));
    } else {
      ok(NO, "should NOT find childView for contentIndex %@ (nowShowing=%@)".fmt(idx, set));
    }
    indexes.remove(idx);
  }, this);

  if (indexes.get('length') === 0) {
    ok(YES, "all nowShowing indexes should have matching child views");
  } else {
    ok(NO, "all nowShowing indexes should have matching child views (indexes not found: %@)".fmt(indexes));
  }
}

module("SC.ListView - simple list", pane.standardSetup());

// ..........................................................
// BASIC RENDER TESTS
//

test("rendering only incremental portion", function() {
  var listView = pane.view("basic").contentView;
  ok(listView.getPath("nowShowing.length") < listView.get('length'), 'nowShowing should be a subset of content items');
  equals(listView.get('childViews').length, listView.get('nowShowing').get('length'), 'should have same number of childViews as nowShowing length');
});

test("scrolling by small amount should update incremental rendering", function() {
  var scrollView = pane.view('basic'),
      listView   = scrollView.contentView,
      exp;

  ok(listView.getPath('nowShowing.length') < listView.get('length'), 'precond - nowShowing has incremental range');

  exp = SC.IndexSet.create(0, 15);
  same(listView.get('nowShowing'), exp, 'nowShowing should start at just the first 20 items');

  // SCROLL DOWN ONE LINE
  SC.run(function() {
    scrollView.scrollTo(0,20);
  });

  // top line should have scrolled out of view
  exp = SC.IndexSet.create(1,15);
  same(listView.get('nowShowing'), exp, 'nowShowing should change to reflect new clippingFrame');

  verifyChildViewsMatch(listView.childViews, exp);

  // SCROLL DOWN ANOTHER LINE
  SC.run(function() {
    scrollView.scrollTo(0,42);
  });

  // top line should have scrolled out of view
  exp = SC.IndexSet.create(2,16);
  same(listView.get('nowShowing'), exp, 'nowShowing should change to reflect new clippingFrame');

  verifyChildViewsMatch(listView.childViews, exp);


  // SCROLL UP ONE LINE
  SC.run(function() {
    scrollView.scrollTo(0,21);
  });

  // top line should have scrolled out of view
  exp = SC.IndexSet.create(1,16);
  same(listView.get('nowShowing'), exp, 'nowShowing should change to reflect new clippingFrame');

  verifyChildViewsMatch(listView.childViews, exp);

});
