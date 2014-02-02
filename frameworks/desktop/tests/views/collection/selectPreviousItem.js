// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view ;
var content = "1 2 3 4 5 6 7 8 9 10".w().map(function(x) {
  return SC.Object.create({ title: x });
});

module("SC.CollectionView.selectPreviousItem", {
  setup: function() {
    view = SC.CollectionView.create({
      content: content
    });
  }
});

/*
  Creates an SC.SelectionSet from a given index.

  @param {Number} index the index of the content to select
  @returns {SC.SelectionSet}
*/

function selectionFromIndex(index) {
  var ret = SC.SelectionSet.create();
  ret.addObject(content.objectAt(index));

  return ret;
}

// ..........................................................
// BASIC OPERATIONS
//

test("selectPreviousItem(extend=undefined, numberOfItems=undefined)", function() {
  var sel = selectionFromIndex(4),
      expected = selectionFromIndex(3),
      actual;
      
  view.set('selection', sel);
  view.selectPreviousItem();
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should select previous to %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectPreviousItem(extend=NO, numberOfItems=undefined)", function() {
  var sel = selectionFromIndex(4),
      expected = selectionFromIndex(3),
      actual;
      
  view.set('selection', sel);
  view.selectPreviousItem(NO);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should select previous to %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectPreviousItem(extend=YES, numberOfItems=undefined)", function() {
  var sel = selectionFromIndex(4),
      expected = SC.SelectionSet.create().add(content,3,2),
      actual;
      
  view.set('selection', sel);
  view.selectPreviousItem(YES);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should extend to previous of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectPreviousItem(extend=YES, numberOfItems=2)", function() {
  var sel = selectionFromIndex(4),
      expected = SC.SelectionSet.create().add(content,2,3),
      actual;
      
  view.set('selection', sel);
  view.selectPreviousItem(YES,2);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should extend to previous of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

// ..........................................................
// ANCHOR CASES
// 

test("anchor test", function() {
  var sel = SC.SelectionSet.create().add(content,2,3),
      expected, actual;
      
  view.set('selection', sel);

  // TRY 1: Set anchor
  view.selectPreviousItem(YES); // first one sets the anchor
  expected = SC.SelectionSet.create().add(content,2,2); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 1: should reduce end of selection (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 2: further reduce selection
  view.selectPreviousItem(YES); 
  expected = selectionFromIndex(2); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 2: should reduce end of selection again (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 3: selection as only anchor, start to increase top
  view.selectPreviousItem(YES); 
  expected = SC.SelectionSet.create().add(content,1,2); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 3: should extend selection at top (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 4: further expand selection from top
  view.selectPreviousItem(YES); 
  expected = SC.SelectionSet.create().add(content,0,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 4: should extend selection at top again (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 5: at top; can no longer expand selection
  view.selectPreviousItem(YES); 
  expected = SC.SelectionSet.create().add(content,0,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 5: selection it at top, cannot extend further (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 6: try again just to be sure
  view.selectPreviousItem(YES); 
  expected = SC.SelectionSet.create().add(content,0,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 6: multiple calls when already at top do nothing (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
});

test("anchor test 2", function() {
  var sel = SC.SelectionSet.create().add(content,4,5),
      expected, actual;
      
  view.set('selection', sel);

  // TRY 1: Set anchor
  view.selectPreviousItem(YES); // first one sets the anchor
  expected = SC.SelectionSet.create().add(content,4,4); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 1: should reduce end of selection (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 2: further reduce selection
  view.selectPreviousItem(YES); 
  expected = SC.SelectionSet.create().add(content,4,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 2: should reduce end of selection again (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 3: don't extend.  jumps to previous item and resets selection
  view.selectPreviousItem(NO); 
  expected = selectionFromIndex(3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 3: not extending clears selection and anchor (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 4: now should expand from top with new selection
  view.selectPreviousItem(YES); 
  expected = SC.SelectionSet.create().add(content,2,2); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 4: should expand from top of new selection (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 5: at top; can no longer expand selection
  view.selectPreviousItem(YES); 
  expected = SC.SelectionSet.create().add(content,1,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 5: should further expand top (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  
});


// ..........................................................
// EDGE CASES
// 

test("selectPreviousItem() when selection is 0..0", function() {
  var sel = selectionFromIndex(0),
      expected = selectionFromIndex(0),
      actual;
      
  view.set('selection', sel);
  view.selectPreviousItem();
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should should not change from previous of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectPreviousItem(YES) when selection is 0..1", function() {
  var sel = SC.SelectionSet.create().add(content,0,2),
      expected = SC.SelectionSet.create().add(content,0,2),
      actual;
      
  view.set('selection', sel);
  view._selectionAnchor = 1 ; // fake anchor
  view.selectPreviousItem(YES);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should should not change from previous of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});
