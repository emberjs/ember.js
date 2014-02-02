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

module("SC.CollectionView.selectNextItem", {
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

test("selectNextItem(extend=undefined, numberOfItems=undefined)", function() {
  var sel = selectionFromIndex(4),
      expected = selectionFromIndex(5),
      actual;
      
  view.set('selection', sel);
  view.selectNextItem();
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should select next to %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectNextItem(extend=NO, numberOfItems=undefined)", function() {
  var sel = selectionFromIndex(4),
      expected = selectionFromIndex(5),
      actual;
      
  view.set('selection', sel);
  view.selectNextItem(NO);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should select next to %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectNextItem(extend=YES, numberOfItems=undefined)", function() {
  var sel = selectionFromIndex(4),
      expected = SC.SelectionSet.create().add(content,4,2),
      actual;
      
  view.set('selection', sel);
  view.selectNextItem(YES);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should extend to next of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectNextItem(extend=YES, numberOfItems=2)", function() {
  var sel = selectionFromIndex(4),
      expected = SC.SelectionSet.create().add(content,4,3),
      actual;
      
  view.set('selection', sel);
  view.selectNextItem(YES,2);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should extend to next of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

// ..........................................................
// ANCHOR CASES
// 

test("anchor test", function() {
  var sel = SC.SelectionSet.create().add(content,5,3),
      expected, actual;
      
  view.set('selection', sel);

  // TRY 1: Set anchor
  view.selectNextItem(YES); // first one sets the anchor
  expected = SC.SelectionSet.create().add(content,5,4); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 1: should extend end of selection (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 2: further extend selection
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,5,5); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 2: should extend end of selection again (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 3: at end, should do nothing more
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,5,5); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 3: should do nothing at end of selection (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 4: at end, idempotent
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,5,5); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 4: multiple calls to extend when at end should do nothing (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  
});

test("anchor test 2 - anchor at end", function() {
  var sel = SC.SelectionSet.create().add(content,4,4),
      expected, actual;
      
  view.set('selection', sel);
  view._selectionAnchor = 7 ; // fake reverse anchor

  // TRY 1: Reduce selection
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,5,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 1: should reduce top of selection (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
  // TRY 2: further reduce selection
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,6,2); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 2: should further reduce top of selection again (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 3: should make selection one item long
  view.selectNextItem(YES); 
  expected = selectionFromIndex(7); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 3: make selection one item long (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 4: should start to extend selection
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,7,2); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 4: extend selection at end (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 5: should extend selection again
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,7,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 5: further extend selection at end (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;

  // TRY 6: do nothing
  view.selectNextItem(YES); 
  expected = SC.SelectionSet.create().add(content,7,3); 
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'TRY 6: do nothing because we are at end (sel: %@ expected: %@ actual: %@)'.fmt(sel, expected, actual));  
  sel = actual;
  
});


// ..........................................................
// EDGE CASES
// 

test("selectNextItem() when selection is 9..9", function() {
  var sel = selectionFromIndex(9),
      expected = selectionFromIndex(9),
      actual;
      
  view.set('selection', sel);
  view.selectNextItem();
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should should not change from previous of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});

test("selectNextItem(YES) when selection is 8..9", function() {
  var sel = SC.SelectionSet.create().add(content,8,2),
      expected = SC.SelectionSet.create().add(content,8,2),
      actual;
      
  view.set('selection', sel);
  view._selectionAnchor = 8 ; // fake anchor
  view.selectNextItem(YES);
  
  actual = view.get('selection');
  ok(expected.isEqual(actual), 'should should not change from previous of %@ (expected: %@ actual: %@)'.fmt(sel, expected, actual));  
});
