// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view, content, contentController, pane, actionCalled = 0;

module("SC.CollectionView Touch Events", {
  setup: function() {

    SC.platform.simulateTouchEvents();

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
    SC.RunLoop.begin();
    pane.remove();
    actionCalled = 0;
    SC.RunLoop.end();
  }
});

/*
  Simulates touching the specified index.  If you pass verify as YES or NO
  also verifies that the item view is subsequently selected or not.

  @param {SC.CollectionView} view the view
  @param {Number} index the index to touch on
  @param {SC.SelectionSet} expected expected selection
  @param {Number} delay delay before running the test (optional)
  @returns {void}
*/
function touchOn(view, index, expected, delay) {
  var itemView = view.itemViewForContentIndex(index),
      layer    = itemView.get('layer'),
      opts     = {},
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

      ok(expected ? expected.isEqual(sel) : expected === sel, 'should have selection: %@ after touch on item[%@], actual: %@'.fmt(expected, index, sel));
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
// basic touch
//

test("touching an item should select it", function() {
  touchOn(view, 3, selectionFromIndex(3));
});

test("touching a selected item should maintain it selected", function() {
  view.select(SC.IndexSet.create(1,3));
  touchOn(view, 3, selectionFromIndex(3));
});

test("touching two times on an item should select it", function() {
  touchOn(view, 3);
  touchOn(view, 3);
  itemView = view.itemViewForContentIndex(3);
  equals(itemView.get('isSelected'), YES, 'itemView.isSelected should remain YES after touched two times');
});

test("touching unselected item should clear selection and select it", function() {
  view.select(SC.IndexSet.create(1,5));
  touchOn(view, 7, selectionFromIndex(7));
});

test("first responder", function() {
  touchOn(view, 3);
  equals(view.get('isFirstResponder'), YES, 'view.isFirstResponder should be YES after touch start');
});

test("touching a collection view with null content should not throw an error", function() {
  var failed = NO;
  view.set('content', null);
  try {
    var l = view.get('layer'),
        evt = SC.Event.simulateEvent(l, 'mousedown');
    SC.Event.trigger(l, 'mousedown', [evt]);
  }
  catch (e) { failed = YES; }
  ok(!failed, "touching a collection view with null content should not throw an error");
});

test("touching an item should select it when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  touchOn(view, 3, selectionFromIndex(3));
});

test("touching an unselected item should select it when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  touchOn(view, 3, selectionFromIndex(3));
});

test("touching a selected item should deselect it when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  view.select(SC.IndexSet.create(3,1));
  touchOn(view, 3, SC.SelectionSet.create());
});

test("touching a selected item should remove it from the selection when useToggleSelection is true", function() {
  view.set('useToggleSelection', YES);
  view.select(SC.IndexSet.create(1,5));
  touchOn(view, 5, selectionFromIndexSet(SC.IndexSet.create(1,4)));
});

test("touching an unselected item should select it and clear the previous selection when useToggleSelection is true and allowsMultipleSelection is not", function() {
  view.set('useToggleSelection', YES);
  contentController.set('allowsMultipleSelection', NO);
  touchOn(view, 1, selectionFromIndex(1));
  touchOn(view, 3, selectionFromIndex(3));
});

test("touching an unselected item should fire action when useToggleSelection is true and actOnSelect is true", function() {
  view.set('useToggleSelection', YES);
  view.set('actOnSelect', YES);

  equals(actionCalled, 0, "precond - action hasn't been called");
  touchOn(view, 1);
  equals(actionCalled, 1, "Action called when item is selected");
});

test("touching an item when isSelectable is false doesn't do anything", function() {
  view.set('isSelectable', NO);
  touchOn(view, 1, null);
});

test("touching an item when isEnabled is false doesn't do anything", function() {
  view.set('isEnabled', NO);
  touchOn(view, 1, null);
});
