// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  This test evaluates the creation of list item views with alternating rows
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
        title: "ContentItem %@".fmt(idx)
      });
    }

    return ret ;
  }
});

var pane = SC.ControlTestPane.design()
  .add("basic-even", SC.ScrollView.design({
    layout: { left: 0, right: 0, top: 0, height: 180 },
    hasHorizontalScroller: NO,
    contentView: SC.ListView.design({
      content: ContentArray.create({ length: 10 }),
      showAlternatingRows: YES,
      rowHeight: 20
    })
  }))
  .add("basic-odd", SC.ScrollView.design({
    layout: { left: 0, right: 0, top: 0, height: 180 },
    hasHorizontalScroller: NO,
    contentView: SC.ListView.design({
      content: ContentArray.create({ length: 11 }),
      showAlternatingRows: YES,
      rowHeight: 20
    })
  }));

function verifyClasses(views) {
  var evens = SC.IndexSet.create(0).addEach([2,4,6,8,10]);
  var odds = SC.IndexSet.create(1).addEach([3,5,7,9]);

  views.forEach(function(item) {
    var cq = item.$();
    var idx = item.get('contentIndex');

    if (evens.contains(idx)) {
      ok(!cq.hasClass('odd'), "item %@ doesn't have 'odd' CSS class".fmt(idx));
      ok(cq.hasClass('even'), "item %@ has 'even' CSS class".fmt(idx));
    }
    else if (odds.contains(idx)) {
      ok(cq.hasClass('odd'), "item %@ has 'odd' CSS class".fmt(idx));
      ok(!cq.hasClass('even'), "item %@ doesn't have 'even' CSS class".fmt(idx));
    }
  });
}

module("SC.ListView - alternating rows", pane.standardSetup());

test("alternating class set on list view", function() {
  var listView = pane.view("basic-even").contentView;
  var cq = listView.$();

  ok(cq.hasClass('alternating'), "ListView instance should have 'alternating' CSS class");
});

test("even/odd classes on ListItemView children - even", function() {
  var items = pane.view("basic-even").contentView.childViews;
  verifyClasses(items);
});

test("even/odd classes on ListItemView children - odd", function() {
  items = pane.view("basic-odd").contentView.childViews;
  verifyClasses(items);
});

test("even/odd classes with incremental rendering - even", function() {
  var scrollView = pane.view("basic-even"),
      listView = scrollView.contentView,
      item = listView.childViews;

  SC.run(function() {
    scrollView.scrollTo(0,21);
  });

  verifyClasses(items);

  SC.run(function() {
    scrollView.scrollTo(0,0);
  });

  verifyClasses(items);
});

test("even/odd classes with incremental rendering - odd", function() {
  var scrollView = pane.view("basic-odd"),
      listView = scrollView.contentView,
      item = listView.childViews;

  SC.run(function() {
    scrollView.scrollTo(0,21);
  });

  verifyClasses(items);

  SC.run(function() {
    scrollView.scrollTo(0,0);
  });

  verifyClasses(items);
});
