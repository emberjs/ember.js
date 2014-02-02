// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module test htmlbody ok equals same stop start Q$ */

var controller, // The sample tree controller to test with
content, // The sample content
TestObject; // Class for sample content objects
//
TestObject = SC.Object.extend({
  title: "test",
  toString: function() {
    return "TestObject(%@)".fmt(this.get("title"));
  }
});

/**
  Common set up and teardown for the module. To run this test manually visit:
  http://localhost:4020/sproutcore/foundation/en/current/tests/controllers/tree/selection_support.html
*/
module("Test SC.SelectionSupport mixin with TreeController.", {
  setup: function() {
  var fruit = "Apples Bananas Cherries Dates Eggfruit".w().map(function(name) {
    return TestObject.create({
      displayName: name
    });
  });
    var fruitGroup = SC.Object.create(SC.TreeItemContent, {
      displayName: 'Fruit',
      treeItemChildren: fruit
    });
    var vegetables = "Arugula Beets Cucumbers Dandelions Endives".w().map(function(name) {
      return TestObject.create({
        displayName: name
      });
    });
      var vegetableGroup = SC.Object.create(SC.TreeItemContent, {
        displayName: 'Vegetables',
        treeItemChildren: vegetables
      });

    content = SC.Object.create(SC.TreeItemContent, {
      treeItemIsGrouped: YES,
      treeItemIsExpanded: YES,
      treeItemChildren: [fruitGroup, vegetableGroup]
    });

    controller = SC.TreeController.create({
      treeItemIsGrouped: NO,
      content: content
    });
  },

  teardown: function() {
  }
});

/**
  This test is not particularly useful, just a means to get warmed up for more advanced testing below.
*/
test("SC.TreeController(SC.SelectionSupport) defaults",
function() {
  ok(controller.get("hasSelectionSupport"), 'tree controller hasSelectionSupport should be true');
  ok(controller.get("allowsSelection"), 'tree controller allowsSelection should be true');
  ok(controller.get("allowsMultipleSelection"), 'tree controller allowsMultipleSelection should be true');
  ok(controller.get("allowsEmptySelection"), 'tree controller allowsEmptySelection should be true');
});

/**
  Make sure that first selectable object works even though the content and order may change.
*/
test("SC.TreeController(SC.SelectionSupport) first selectable object",
function() {
  equals(controller.get('firstSelectableObject'), content.treeItemChildren[0].treeItemChildren[0], 'first selectable object should be the first object in arrangedObjects');

  // Reorder the content
  // content.treeItemChildren.sort(function(a,b) { return b > a; });
  // controller.set('orderBy', 'DESC title');
  //
  // equals(controller.get('firstSelectableObject'), content.treeItemChildren[4], 'first selectable object should be the first object in arrangedObjects (changed order)');
});

/**
  Make sure that the empty selection property is honoured.
*/
test("SC.TreeController(SC.SelectionSupport) selection is empty only if allowed",
function() {
  var selectionSet, source = controller.get('arrangedObjects'),
  indexSet;

  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  ok(!controller.get('hasSelection'), 'tree controller should not have a selection');
  ok(indexSet === null, 'selection set should not have an indexSet');

  // Disable allowing empty selection
  controller.set('allowsEmptySelection', NO);

  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  ok(controller.get('hasSelection'), 'tree controller should have a selection');
  ok(indexSet !== null, 'selection set should have an indexSet');
  equals(selectionSet.get('length'), 1, 'selection set should have length 1');
  equals(indexSet.length, 1, 'selection set should have an indexSet with length 1');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[0]), 'selection should be the first content object');
});

/**
  Make sure that the multiple selection property is honoured.
*/
test("SC.TreeController(SC.SelectionSupport) selection is multiple only if allowed",
function() {
  var selectionSet, source = controller.get('arrangedObjects'),
  indexSet;

  // Select 3 items
  controller.selectObjects([content.treeItemChildren[0].treeItemChildren[0], content.treeItemChildren[0].treeItemChildren[1], content.treeItemChildren[1].treeItemChildren[4]], NO);

  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  ok(controller.get('hasSelection'), 'tree controller should have a selection');
  ok(indexSet !== null, 'selection set should have an indexSet');
  equals(selectionSet.get('length'), 3, 'selection set should have length 3');
  equals(indexSet.length, 3, 'selection set should have an indexSet with length 3');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[0]), 'selection should contain the first content object');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[1]), 'selection should contain the third content object');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[4]), 'selection should contain the fifth content object');

  // Disable allowing multiple selection
  controller.set('allowsMultipleSelection', NO);

  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 1, 'selection set should have length 1');
  equals(indexSet.length, 1, 'selection set should have an indexSet with length 1');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[4]), 'selection should be the fifth content object');
});

/**
  Test that selection remains while content grows.
*/
test("SC.TreeController(SC.SelectionSupport) selection remains while content grows",
function() {
  var selectionSet, source, newObject, indexSet;

  // Select 3 items
  controller.selectObjects([content.treeItemChildren[0].treeItemChildren[1], content.treeItemChildren[0].treeItemChildren[2], content.treeItemChildren[1].treeItemChildren[0]], NO);

  // Add an item to the content
  newObject = TestObject.create({
    title: 'Figs'
  });
  content.treeItemChildren[0].treeItemChildren.pushObject(newObject);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 13, 'tree controller content should have 13 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 3, 'selection set should have length 3');
  equals(indexSet.length,  3, 'selection set should have an indexSet with length 3');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[1]), 'selection should contain the second content object of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[2]), 'selection should contain the third content object of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object of the second group');
});

/**
  Test that selection remains while content shrinks, but doesn't effect the selection.
*/
test("SC.TreeController(SC.SelectionSupport) selection remains while content shrinks",
function() {
  var selectionSet, source, indexSet;

  // Select 3 items
  controller.selectObjects([content.treeItemChildren[0].treeItemChildren[1], content.treeItemChildren[0].treeItemChildren[2], content.treeItemChildren[1].treeItemChildren[0]], NO);

  // Remove an item from the content without effecting the selection
  content.treeItemChildren[0].treeItemChildren.removeAt(0);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 11, 'tree controller content should have 11 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 3, 'selection set should length 3');
  equals(indexSet.length, 3, 'selection set should have an indexSet with length 3');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[0]), 'selection should contain the second content object (now first) of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[1]), 'selection should contain the third content object (now second) of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object (still first) of the second group');

  // Remove another item from the content without effecting the selection
  content.treeItemChildren[1].treeItemChildren.removeAt(4);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 10, 'tree controller content should have 10 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 3, 'selection set should length 3');
  equals(indexSet.length, 3, 'selection set should have an indexSet with length 3');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[0]), 'selection should contain the second content object (still first) of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[1]), 'selection should contain the third content object (still second) of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object (still first) of the second group');
});

/**
  Test that selection changes while content shrinks effecting the selection.
*/
test("SC.TreeController(SC.SelectionSupport) selection changes while content shrinks effecting the selection",
function() {
  var selectionSet, source, indexSet;

  // Select 3 items
  controller.selectObjects([content.treeItemChildren[0].treeItemChildren[1], content.treeItemChildren[0].treeItemChildren[2], content.treeItemChildren[1].treeItemChildren[0]], NO);

  // Remove an item from the content effecting the selection
  content.treeItemChildren[0].treeItemChildren.removeAt(2);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 11, 'tree controller content should have 11 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 2, 'selection set should length 2');
  equals(indexSet.length, 2, 'selection set should have an indexSet with length 2');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[1]), 'selection should contain the second content object of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object of the second group');

  // Remove another item from the content effecting the selection
  content.treeItemChildren[1].treeItemChildren.removeAt(0);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 10, 'tree controller content should have 10 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 1, 'selection set should length 1');
  equals(indexSet.length, 1, 'selection set should have an indexSet with length 1');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[1]), 'selection should contain the second content object of the first group');
});

/**
  Test that selection remains while content is replaced without effecting the selection.
*/
test("SC.TreeController(SC.SelectionSupport) selection remains while content is replaced without effecting the selection",
function() {
  var newObject1, newObject2, selectionSet, source, indexSet;

  // Select 3 items
  controller.selectObjects([content.treeItemChildren[0].treeItemChildren[1], content.treeItemChildren[0].treeItemChildren[2], content.treeItemChildren[1].treeItemChildren[0]], NO);

  newObject1 = TestObject.create({
    title: 'Figs'
  });
  newObject2 = TestObject.create({
    title: 'Grapefruits'
  });

  // Replace an item in the content without effecting the selection
  content.treeItemChildren[0].treeItemChildren.replace(0, 1, [newObject1, newObject2]);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 13, 'tree controller content should have 13 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 3, 'selection set should length 3');
  equals(indexSet.length, 3, 'selection set should have an indexSet with length 3');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[2]), 'selection should contain the second content (now third) object of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[3]), 'selection should contain the third content (now fourth) object of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object of the second group');

  // Replace another item in the content without effecting the selection
  content.treeItemChildren[1].treeItemChildren.replace(3, 1, [newObject1, newObject2]);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 14, 'tree controller content should have 14 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 3, 'selection set should have length 3');
  equals(indexSet.length, 3, 'index set should have length 3');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[2]), 'selection should contain the second content (still third) object of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[0].treeItemChildren[3]), 'selection should contain the third content (still fourth) object of the first group');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object of the second group');
});

/**
  Test that selection remains while content is replaced effecting the selection.
*/
test("SC.TreeController(SC.SelectionSupport) selection remains while content is replaced effecting the selection",
function() {
  var newObject1, newObject2, selectionSet, source, indexSet;

  // Select 3 items
  controller.selectObjects([content.treeItemChildren[0].treeItemChildren[1], content.treeItemChildren[0].treeItemChildren[2], content.treeItemChildren[1].treeItemChildren[0]], NO);

  newObject1 = TestObject.create({
    title: 'Figs'
  });
  newObject2 = TestObject.create({
    title: 'Grapefruits'
  });

  // Replace an item in the content effecting the selection
  content.treeItemChildren[0].treeItemChildren.replace(1, 2, [newObject1, newObject2]);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 12, 'tree controller content should have 12 items');
  ok(controller.get('hasSelection'), 'tree controller should still have a selection');
  ok(indexSet !== null, 'selection set should still have an indexSet');
  equals(selectionSet.get('length'), 1, 'selection set should length 1');
  equals(indexSet.length, 1, 'selection set should have an indexSet with length 1');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object of the second group');

  // Replace another item in the content effecting the selection
  content.treeItemChildren[1].treeItemChildren.replace(0, 1, [newObject1, newObject2]);

  source = controller.get('arrangedObjects');
  selectionSet = controller.get('selection');
  indexSet = selectionSet.indexSetForSource(source);
  equals(source.get('length'), 13, 'tree controller content should have 13 items');
  ok(!controller.get('hasSelection'), 'tree controller should not have a selection');
  equals(selectionSet.get('length'), 0, 'selection set should have length 0');
  ok(indexSet === null, 'selection set should not have an indexSet');
});

/**
  Test that selection is cleared if the content is nulled.

  There was a bug that setting the content of a tree controller to null would
  throw an exception.
*/
test("SC.TreeController(SC.SelectionSupport) selection cleared if content is removed.",
function() {
  var newObject1, newObject2, selectionSet, source, indexSet;

  // Select 3 items
  controller.selectObjects([content.treeItemChildren[0].treeItemChildren[1], content.treeItemChildren[0].treeItemChildren[2], content.treeItemChildren[1].treeItemChildren[0]], NO);

  selectionSet = controller.get('selection');
  equals(selectionSet.get('length'), 3, 'selection set should length 1');
  ok(selectionSet.containsObject(content.treeItemChildren[1].treeItemChildren[0]), 'selection should contain the first content object of the second group');

  // Clear out the content of the tree controller.
  controller.set('content', null);

  // Selection should be empty.
  selectionSet = controller.get('selection');
  equals(selectionSet.get('length'), 0, 'selection set should have length 0');
});

test("SC.TreeController(SC.SelectionSupport) selection settings should persist between controller and tree item observer",
function() {
  var treeItemObserver = controller.get('arrangedObjects');

  SC.RunLoop.begin();
  controller.set('allowsSelection', YES);
  controller.set('allowsMultipleSelection', YES);
  controller.set('allowsEmptySelection', YES);
  SC.RunLoop.end();

  equals(treeItemObserver.get('allowsSelection'), YES, 'allowsSelection on the treeItemObserver should be YES');
  equals(treeItemObserver.get('allowsMultipleSelection'), YES, 'allowsMultipleSelection on the treeItemObserver should be YES');
  equals(treeItemObserver.get('allowsEmptySelection'), YES, 'allowsEmptySelection on the treeItemObserver should be YES');

  SC.RunLoop.begin();
  controller.set('allowsSelection', NO);
  controller.set('allowsMultipleSelection', NO);
  controller.set('allowsEmptySelection', NO);
  SC.RunLoop.end();

  equals(treeItemObserver.get('allowsSelection'), NO, 'allowsSelection on the treeItemObserver should be NO');
  equals(treeItemObserver.get('allowsMultipleSelection'), NO, 'allowsMultipleSelection on the treeItemObserver should be NO');
  equals(treeItemObserver.get('allowsEmptySelection'), NO, 'allowsEmptySelection on the treeItemObserver should be NO');

});
