// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view, sel, beforeLen, afterLen, content ;

module("SC.CollectionView.deleteSelection", {
  setup: function() {

    content = "1 2 3 4 5 6 7 8 9 10".w().map(function(x) {
      return SC.Object.create({ title: x });
    });

    sel  = SC.SelectionSet.create().add(content,4,2);

    view = SC.CollectionView.create({
      content: content,
      selection: sel,
      canDeleteContent: YES
    });
    
    beforeLen = content.get('length');
    afterLen  = beforeLen - sel.get('length');
  }
});

// ..........................................................
// BASIC OPERATIONS
// 

test("canDeleteContent", function() {
  
  view.set('canDeleteContent', NO);
  equals(view.deleteSelection(), NO, 'should return NO if not allowed');
  equals(content.get('length'), beforeLen, 'content.length should not change');
  equals(view.get('selection').get('length'), 2, 'should not change selection');
  
  view.set('canDeleteContent', YES);
  equals(view.deleteSelection(), YES, 'should return YES if allowed');
  equals(content.get('length'), afterLen, 'content.length should change');
  equals(view.get('selection').indexSetForSource(content).get('min'), 3, 'should select an adjacent item');
});

test("empty selection case", function() {
  view.select(null); // clear selection
  view.set('canDeleteContent', YES);
  equals(view.get('selection').get('length'), 0, 'precond - should have empty selection');

  equals(view.deleteSelection(), NO, 'should return NO if not allowed');
  equals(content.get('length'), beforeLen, 'content.length should not change');
});

test("delegate.collectionViewShouldDeleteIndexes", function() {
  view.set('canDeleteContent', YES);
  view.delegate = SC.Object.create(SC.CollectionViewDelegate, {
    
    v: null,
    
    collectionViewShouldDeleteIndexes: function() { return this.v; }
  });

  // delegate returns NO
  equals(view.deleteSelection(), NO, 'should return NO if not allowed');
  equals(content.get('length'), beforeLen, 'content.length should not change');
  equals(view.get('selection').get('length'), 2, 'should not change selection');
  
  // delegate returns partial
  view.delegate.v = SC.IndexSet.create(4,1);
  equals(view.get('selectionDelegate'), view.delegate, 'selection delegate should be delegate object');
  equals(view.deleteSelection(), YES, 'should return YES if allowed');
  equals(content.get('length'), afterLen+1, 'content.length should change');
  equals(view.get('selection').get('length'), 1, 'non-deleted parts should remain selected %@'.fmt(view.get('selection')));
});

// ..........................................................
// EDGE CASES
// 

// Add special edge cases here
