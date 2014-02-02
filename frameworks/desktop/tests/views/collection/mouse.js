// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view, content, contentController, pane, actionCalled = 0;

module("SC.CollectionView Mouse Events", {
  setup: function() {

    SC.RunLoop.begin();

    content = "1 2 3 4 5 6 7 8 9 10".w().map(function(x) {
      return SC.Object.create({ value: x });
    });

    contentController = SC.ArrayController.create({
      content: content,
      allowsMultipleSelection: YES
    });

    view = SC.CollectionView.create({
      content: contentController,

      layout: { top: 0, left: 0, width: 300, height: 500 },

      layoutForContentIndex: function(idx) {
        return { left: 0, right: 0, top: idx * 50, height: 50 };
      },

      isVisibleInWindow: YES,
      acceptsFirstResponder: YES,
      action: function() {
        actionCalled++;
      }
    });

    pane = SC.MainPane.create();
    pane.appendChild(view);
    pane.append();

    SC.RunLoop.end();
  },

  teardown: function() {
    pane.destroy();
    actionCalled = 0;
  }
});

/*
  Simulates clicking on the specified index.  If you pass verify as YES or NO
  also verifies that the item view is subsequently selected or not.

  @param {SC.CollectionView} view the view
  @param {Number} index the index to click on
  @param {Boolean} shiftKey simulate shift key pressed
  @param {Boolean} ctrlKey simulate ctrlKey pressed
  @param {SC.SelectionSet} expected expected selection
  @param {Number} delay delay before running the test (optional)
  @returns {void}
*/
function clickOn(view, index, shiftKey, ctrlKey, expected, delay) {
  var itemView = view.itemViewForContentIndex(index),
      layer    = itemView.get('layer'),
      opts     = { shiftKey: shiftKey, ctrlKey: ctrlKey },
      sel, ev, modifiers;

  ok(layer, 'precond - itemView[%@] should have layer'.fmt(index));

  ev = SC.Event.simulateEvent(layer, 'mousedown', opts);
  SC.Event.trigger(layer, 'mousedown', [ev]);

  ev = SC.Event.simulateEvent(layer, 'mouseup', opts);
  SC.Event.trigger(layer, 'mouseup', [ev]);

  if (expected !== undefined) {
    var f = function() {
      SC.RunLoop.begin();
      sel = view.get('selection');

      modifiers = [];
      if (shiftKey) modifiers.push('shift');
      if (ctrlKey) modifiers.push('ctrl');
      modifiers = modifiers.length > 0 ? modifiers.join('+') : 'no modifiers';

      ok(expected ? expected.isEqual(sel) : expected === sel, 'should have selection: %@ after click with %@ on item[%@], actual: %@'.fmt(expected, modifiers, index, sel));
      SC.RunLoop.end();
      if (delay) window.start() ; // starts the test runner
    };

    if (delay) {
      stop() ; // stops the test runner
      setTimeout(f, delay) ;
    } else f() ;
  }

  layer = itemView = null ;
}

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

/*
  Creates an SC.SelectionSet from a given SC.IndexSet.

  @param {Number} index the index of the content to select
  @returns {SC.SelectionSet}
*/
function selectionFromIndexSet(indexSet) {
  var ret = SC.SelectionSet.create();
  ret.add(content, indexSet);

  return ret;
}

// ..........................................................
// basic click
//

test("clicking on an item should select it", function() {
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
});

test("clicking on a selected item should clear selection after 300ms and reselect it", function() {
  view.select(SC.IndexSet.create(1,5));
  SC.RootResponder.responder._lastMouseUpAt = null ; // HACK: don't want a doubleClick from previous tests
  clickOn(view, 3, NO, NO, selectionFromIndex(3), 500);
});

test("clicking on unselected item should clear selection and select it", function() {
  view.select(SC.IndexSet.create(1,5));
  clickOn(view, 7, NO, NO, selectionFromIndex(7));
});

test("first responder", function() {
  clickOn(view, 3);
  equals(view.get('isFirstResponder'), YES, 'view.isFirstResponder should be YES after mouse down');
});

test("clicking on a collection view with null content should not throw an error", function() {
  var failed = NO;
  view.set('content', null);
  try {
    var l = view.get('layer'),
        evt = SC.Event.simulateEvent(l, 'mousedown');
    SC.Event.trigger(l, 'mousedown', [evt]);
  }
  catch (e) { failed = YES; }
  ok(!failed, "clicking on a collection view with null content should not throw an error");
});


// ..........................................................
// ctrl-click mouse down
//

test("ctrl-clicking on unselected item should add to selection", function() {
  clickOn(view,3, NO, YES, selectionFromIndex(3));
  clickOn(view,5, NO, YES, selectionFromIndex(3).addObject(content.objectAt(5)));
});

test("ctrl-clicking on selected item should remove from selection", function() {
  clickOn(view,3, NO, YES, selectionFromIndex(3));
  clickOn(view,5, NO, YES, selectionFromIndex(3).addObject(content.objectAt(5)));
  clickOn(view,3, NO, YES, selectionFromIndex(5));
  clickOn(view,5, NO, YES, SC.SelectionSet.create());
});

// ..........................................................
// shift-click mouse down
//

test("shift-clicking on an item below should extend the selection", function() {
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
  clickOn(view, 5, YES, NO, selectionFromIndexSet(SC.IndexSet.create(3,3)));
});


test("shift-clicking on an item above should extend the selection", function() {
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
  clickOn(view, 1, YES, NO, selectionFromIndexSet(SC.IndexSet.create(1,3)));
});

test("shift-clicking inside selection first time should reduce selection from top", function() {
  view.select(SC.IndexSet.create(3,4));
  clickOn(view,4, YES, NO, selectionFromIndexSet(SC.IndexSet.create(3,2)));
});

test("shift-click below to extend selection down then shift-click inside selection should reduce selection", function() {
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
  clickOn(view, 5, YES, NO, selectionFromIndexSet(SC.IndexSet.create(3,3)));
  clickOn(view,4, YES, NO, selectionFromIndexSet(SC.IndexSet.create(3,2)));
});

test("shift-click above to extend selection down then shift-click inside selection should reduce top of selection", function() {
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
  clickOn(view, 1, YES, NO, selectionFromIndexSet(SC.IndexSet.create(1,3)));
  clickOn(view,2, YES, NO, selectionFromIndexSet(SC.IndexSet.create(2,2)));
});

test("shift-click below bottom of selection then shift click on top of selection should select only top item", function() {
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
  clickOn(view, 5, YES, NO, selectionFromIndexSet(SC.IndexSet.create(3,3)));
  clickOn(view,3, YES, NO, selectionFromIndex(3));
});

test("clicking on an item should select it when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
});

test("clicking on an unselected item should select it when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
});

test("clicking on a selected item should deselect it when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  view.select(SC.IndexSet.create(3,1));
  clickOn(view, 3, NO, NO, SC.SelectionSet.create());
});

test("clicking on an unselected item should select it and add it to the selection when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  clickOn(view, 1, NO, NO, selectionFromIndex(1));
  clickOn(view, 3, NO, NO, selectionFromIndex(1).addObject(content.objectAt(3)));
});

test("clicking on a selected item should remove it from the selection when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  view.select(SC.IndexSet.create(1,5));
  clickOn(view, 5, NO, NO, selectionFromIndexSet(SC.IndexSet.create(1,4)));
});

test("clicking on an unselected item should select it and clear the previous selection when useToggleSelection is true and allowsMultipleSelection is not", function() {
  view.set('useToggleSelection', YES);
  contentController.set('allowsMultipleSelection', NO);
  clickOn(view, 1, NO, NO, selectionFromIndex(1));
  clickOn(view, 3, NO, NO, selectionFromIndex(3));
});

test("clicking on an unselected item should fire action when useToggleSelection is true and actOnSelect is true", function() {
  view.set('useToggleSelection', YES);
  view.set('actOnSelect', YES);

  equals(actionCalled, 0, "precond - action hasn't been called");
  clickOn(view, 1, NO, NO);
  equals(actionCalled, 1, "Action called when item is selected");
});

test("click on an item when isSelectable is false doesn't do anything", function() {
  view.set('isSelectable', NO);
  clickOn(view, 1, NO, NO, null);
});

test("click on an item when isEnabled is false doesn't do anything", function() {
  SC.run(function () {
    view.set('isEnabled', NO);
  });
  clickOn(view, 1, NO, NO, null);
});
