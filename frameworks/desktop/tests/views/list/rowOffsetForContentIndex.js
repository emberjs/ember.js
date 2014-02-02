// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var content, delegate ;
var Delegate = SC.Object.extend(SC.CollectionRowDelegate, {
  rowHeight: 40,
  customRowHeightIndexes: SC.IndexSet.create(3).add(5,2),
  contentIndexRowHeight: function(view, content, index) {
    return this.get('customRowHeightIndexes').contains(index) ? view.get('customRowHeight') : this.get('rowHeight');
  },
  
  expected: function(view) {
    var ret = [],
        content = view.get('content'),
        loc = view.get('length');
        
    while(--loc>=0) {
      ret[loc] = this.contentIndexRowHeight(view,content,loc);
    }
    
    return ret ;
  }
});

module("SC.ListView.rowOffsetForContentIndex", {
  setup: function() {
    content = "1 2 3 4 5 6 7 8 9 0".w().map(function(x) {
      return SC.Object.create({ value: x });
    }, this);
    
    // set this delegate if you want custom row heights
    delegate = Delegate.create();
    
  }
});

function verifyRowOffsets(view, rowHeight, expected) {
  var loc = view.get('length'), actual, idx, cur=0;
  
  for(idx=0;idx<loc;idx++) {
    actual = view.rowOffsetForContentIndex(idx);
    equals(actual, cur, "content.rowHeightForContentIndex(%@) should be expected offset".fmt(idx));
    cur += expected ? expected[idx] : rowHeight;
  }
  
  ok(loc>0, 'content should have some length');
  equals(view.rowOffsetForContentIndex(loc), cur, 'content.rowHeightForContentIndex(length) should be rowHeight');  
  
}

// ..........................................................
// BASIC TESTS
// 

test("constant row heights", function() {
  var view = SC.ListView.create({ content: content, rowHeight: 40, customRowHeightIndexes: null });
  verifyRowOffsets(view, 40);
});

test("constant row heights with rowSpacing", function() {
  var view = SC.ListView.create({ content: content, rowHeight: 40, rowSpacing: 2, customRowHeightIndexes: null });
  verifyRowOffsets(view, 42);
});

test("custom row heights", function() {
  var view = SC.ListView.create({
    content: content,
    rowHeight: 30,
    customRowHeight: 50,
    delegate: delegate
  });
  verifyRowOffsets(view, 40, delegate.expected(view));
});

test("adding delegate should update calculation", function() {
  var view = SC.ListView.create({
    content: content,
    rowHeight: 30,
    customRowHeight: 50
  });
  verifyRowOffsets(view, 30);
  
  view.set('delegate', delegate);
  verifyRowOffsets(view, 40, delegate.expected(view));
});

test("changing delegate from custom to not custom should update", function() {
  var view = SC.ListView.create({
    content: content,
    rowHeight: 12,
    customRowHeight: 50,
    delegate: delegate
  });
  verifyRowOffsets(view, 40, delegate.expected(view));
  
  delegate.set('customRowHeightIndexes', null);
  verifyRowOffsets(view, 40);
});

// ..........................................................
// SPECIAL CASES
// 

test("computed custom row height indexes", function() {
  
  delegate = Delegate.create({
    indexes: Delegate.prototype.customRowHeightIndexes,
    useIndexes: NO,
    
    customRowHeightIndexes: function() {
      return this.get('useIndexes') ? this.get('indexes') : null;
    }.property('useIndexes').cacheable()
  });

  var view = SC.ListView.create({
    content: content,
    rowHeight: 12,
    customRowHeight: 50,
    delegate: delegate
  });
  verifyRowOffsets(view, 40);


  delegate.set('useIndexes', YES);
  verifyRowOffsets(view, 40, delegate.expected(view));  
});

