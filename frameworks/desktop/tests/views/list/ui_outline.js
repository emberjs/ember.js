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

var TreeItem = SC.Object.extend(SC.TreeItemContent, {

  length: 10,

  title: "TREE ITEM",

  depth: 0,

  treeItemChildren: function() {
    var ret = [], loc = this.get('length'), depth = this.get('depth')+1;
    if (depth>3) loc = loc*3
    while(--loc>=0) ret[loc] = TreeItem.create({ parent: this, unread: loc, depth: depth, treeItemIsExpanded: (depth<2) });
    return ret ;
  }.property().cacheable(),

  treeItemIsExpanded: YES,

  treeItemBranchIndexes: function() {
    return this.depth<3 ? SC.IndexSet.create(0, this.get('length')) : null;
  }

});

var root = TreeItem.create({ treeItemIsExpanded: YES });
var del = SC.Object.create();

var pane = SC.ControlTestPane.design()
  .add("basic", SC.ScrollView.design({
    layout: { left: 0, right: 0, top: 0, height: 300 },
    hasHorizontalScroller: NO,
    contentView: SC.ListView.design({
      content: SC.TreeItemObserver.create({ item: root, delegate: del }),
      contentValueKey: "title",
      contentCheckboxKey: "isDone",
      contentUnreadCountKey: "unread",
      rowHeight: 20

    })
  }));

module("SC.ListView - outline list", pane.standardSetup());

test("What should be tested here?");
