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

module("SC.CollectionView.selection", {
  setup: function() {
    view = SC.CollectionView.create({
      isVisibleInWindow: YES, // force render
      content: content
    });
  }
});

/*
  Helper method to validate that the item views in the view have the
  proper selection state.  Pass in the collection view and the selection.

  @param {SC.CollectionView} view the view to test
  @param {SC.IndexSet} sel the index set
  @param {String} testName the name of the test
  @returns {void}
*/
function verifySelection(view, sel, testName) {
  var childViews = view.get('childViews'),
      len = childViews.get('length'),
      idx, itemView, expected, actual ;

  if (!testName) testName = '';

  equals(len, view.get('nowShowing').get('length'), '%@ precond - must have childViews for each nowShowing'.fmt(testName));

  for(idx=0;idx<len;idx++) {
    itemView = childViews[idx];
    ok(!SC.none(itemView.contentIndex), '%@ precond - itemView[%@] must have contentIndex'.fmt(testName, idx));

    expected = sel.contains(itemView.contentIndex);
    actual   = itemView.get('isSelected');
    equals(actual, expected, '%@ itemView[%@].isSelected should match selection(%@)'.fmt(testName, idx, sel));
  }
}

// ..........................................................
// SELECTION SYNCING WITH ITEM VIEWS
//

test("item views should have proper isSelected state on reload", function() {
  var sel = SC.IndexSet.create(3,2).add(8),
      set = SC.SelectionSet.create().add(view.get('content'), sel);

  view.set('selection', set);
  SC.run(function() { view.reload(); }); // make sure it loads

  verifySelection(view, sel);
});

test("item views should update isSelected state when selection property changes", function() {

  var sel1 = SC.IndexSet.create(3,2),
      sel2 = SC.IndexSet.create(8);

  view.set('selection',SC.SelectionSet.create().add(view.content, sel1));
  SC.run(function() { view.reload(); });
  verifySelection(view, sel1, 'before');

  SC.run(function() {
    view.set('selection',SC.SelectionSet.create().add(view.content, sel2));
  });
  verifySelection(view, sel2, 'after');

});

test("item views should not update isSelected state when old index set selection changes", function() {

  var sel1 = SC.IndexSet.create(3,2),
      sel2 = SC.IndexSet.create(8);

  view.set('selection',SC.SelectionSet.create().add(view.content, sel1));
  SC.run(function() { view.reload(); });
  SC.run(function() {
    view.set('selection', SC.SelectionSet.create().add(view.content, sel2));
  });
  verifySelection(view, sel2, 'before');

  SC.run(function() { sel1.add(10).remove(8); });
  verifySelection(view, sel2, 'after');

});

test("item views should update isSelected state when selection index set is modified", function() {

  var sel = SC.IndexSet.create(3,2),
      content = view.get('content'),
      set = SC.SelectionSet.create().add(content, sel);

  view.set('selection',set);
  SC.run(function() { view.reload(); });
  verifySelection(view, sel, 'before');

  SC.run(function() { set.add(content, 8).remove(content, 4); });
  verifySelection(view, SC.IndexSet.create(3).add(8), 'after');

});


// ..........................................................
// SPECIAL CASES
//

test("reloading some items should still update selection properly", function() {
  var sel1 = SC.IndexSet.create(3,2),
      sel2 = SC.IndexSet.create(4,2).add(8);

  view.set('selection', SC.SelectionSet.create().add(view.content, sel1));
  SC.run(function() { view.reload(); });

  SC.run(function() {
    view.reload(SC.IndexSet.create(4).add(8));
    view.set('selection', SC.SelectionSet.create().add(view.content, sel2));
  });

  verifySelection(view, sel2, 'after');
});

test("select() should round trip", function() {

  var sel = SC.IndexSet.create(3,2);

  SC.run(function() { view.reload(); }); // make sure view is all ready
  SC.run(function() { view.select(sel); });
  verifySelection(view, sel);
});




