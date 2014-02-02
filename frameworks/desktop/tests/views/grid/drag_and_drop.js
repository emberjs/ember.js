// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  This test evaluates drag and drop support for SC.GridView
*/

// Create a fake content array.  Generates a list with whatever length you
// want of objects with a title based on the index.  Cannot mutate.
var ContentArray = SC.Object.extend(SC.Array, {

  length: 0,

  objectAt: function(idx) {
    if (idx >= this.get('length')) { return undefined; }

    var content = this._content, ret ;
    if (!content) { content = this._content = []; }

    ret = content[idx];
    if (!ret) {
      ret = content[idx] = SC.Object.create({
        title: "ContentItem %@".fmt(idx),
        isDone: (idx % 3)===0,
        unread: (Math.random() > 0.5) ? Math.floor(Math.random() * 100) : 0
      });
    }

    return ret ;
  }
});

var pane = SC.ControlTestPane.design()
  .add("basic", SC.ScrollView.design({
    borderStyle: SC.BORDER_NONE,
    layout: { left: 0, right: 0, top: 0, height: 300 },
    hasHorizontalScroller: NO,
    contentView: SC.GridView.design({
      content: ContentArray.create({ length: 5 }),
      contentValueKey: "title",
      contentCheckboxKey: "isDone",
      contentUnreadCountKey: "unread",
      rowHeight: 20,
      _didCallDragEnded: false,
      dragEnded: function() {
        sc_super();
        this._didCallDragEnded = true;
      }
    })
  }));

module("SC.GridView - drag and drop", pane.standardSetup());

test("drag on default grid view", function() {
  var ev,
    frame,
    itemView,
    layer,
    gridView = pane.view("basic").get('contentView');

  itemView = gridView.itemViewForContentIndex(0);
  frame = itemView.get('frame');
  layer = itemView.get('layer');
  ev = SC.Event.simulateEvent(layer, 'mousedown', { clientX: frame.x, clientY: frame.y });
  SC.Event.trigger(layer, 'mousedown', [ev]);

  ev = SC.Event.simulateEvent(layer, 'mousemove');
  SC.Event.trigger(layer, 'mousemove', [ev]);

  equals(gridView.get('dragContent'), null, 'dragContent should not be set, because the default implementation should prevent dragging');

  // Clean up
  ev = SC.Event.simulateEvent(layer, 'mouseup');
  SC.Event.trigger(layer, 'mouseup', [ev]);
});


test("drag on grid view with SC.DROP_ON support", function() {
  var ev,
    frame,
    itemView,
    layer,
    gridView = pane.view("basic").get('contentView');

  // Configure the view to accept drop on.
  gridView.set('canReorderContent', YES);
  gridView.set('isDropTarget', YES);
  gridView.set('delegate', SC.Object.create(SC.CollectionViewDelegate, {
     collectionViewValidateDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
      return SC.DRAG_ANY;
    }
  }));

  itemView = gridView.itemViewForContentIndex(0);
  frame = itemView.get('frame');
  layer = itemView.get('layer');

  ev = SC.Event.simulateEvent(layer, 'mousedown', { clientX: frame.x, clientY: frame.y });
  SC.Event.trigger(layer, 'mousedown', [ev]);

  var f = function() {
    var halfWidth,
      itemView2,
      point;

    ev = SC.Event.simulateEvent(layer, 'mousemove');
    SC.Event.trigger(layer, 'mousemove', [ev]);

    equals(gridView.get('dragContent').content, gridView.get('content'), "dragContent.content should be equal to the GridView's content");
    ok(gridView.get('dragContent').indexes.isEqual(SC.IndexSet.create(0)), "dragContent.indexes should be equal to indexes equal to [{0}]");


    // Drag over 2nd item
    itemView2 = gridView.itemViewForContentIndex(1);
    layer = itemView2.get('layer');
    point = SC.offset(layer);

    // Note: GridView won't accept a DROP_ON unless past 20% into the width of the item.
    halfWidth = itemView2.get('frame').width * 0.5;

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + halfWidth, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);

    ok(itemView2.get('isDropTarget'), "second grid item should have isDropTarget set to true");


    // Drag over 3rd item
    itemView = gridView.itemViewForContentIndex(2);
    layer = itemView.get('layer');
    point = SC.offset(layer);

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + halfWidth, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);

    ok(itemView.get('isDropTarget'), "third grid item should have isDropTarget set to true");
    ok(!itemView2.get('isDropTarget'), "second grid item should not have isDropTarget set to true");

    // Clean up
    ev = SC.Event.simulateEvent(layer, 'mouseup');
    SC.Event.trigger(layer, 'mouseup', [ev]);

    start();
  };

  setTimeout(f, 200);
  stop(700); // stops the test runner
});

test("insertion point when drag on grid view", function() {
  var ev,
    frame,
    itemView,
    layer,
    gridView = pane.view("basic").get('contentView');

  // Configure the view to accept drop on.
  gridView.set('canReorderContent', YES);

  itemView = gridView.itemViewForContentIndex(0);
  frame = itemView.get('frame');
  layer = itemView.get('layer');

  ev = SC.Event.simulateEvent(layer, 'mousedown', { clientX: frame.x, clientY: frame.y });
  SC.Event.trigger(layer, 'mousedown', [ev]);

  var f = function() {
    var halfWidth,
      itemView2,
      point;

    ev = SC.Event.simulateEvent(layer, 'mousemove');
    SC.Event.trigger(layer, 'mousemove', [ev]);

    // Drag over 2nd item
    itemView2 = gridView.itemViewForContentIndex(1);
    layer = itemView2.get('layer');
    point = SC.offset(layer);

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + 1, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);

    ok(gridView._insertionPointView, "An insertion point should have been added");

    // Clean up
    ev = SC.Event.simulateEvent(layer, 'mouseup');
    SC.Event.trigger(layer, 'mouseup', [ev]);

    equals(gridView._insertionPointView, null, "The insertion point should have been destroyed");

    start();
  };

  stop(); // stops the test runner
  setTimeout(f, 200);
});

test("insertion point when cancel drag on grid view", function() {
  var ev,
    frame,
    itemView,
    layer,
    gridView = pane.view("basic").get('contentView');

  gridView.set('canReorderContent', YES);

  itemView = gridView.itemViewForContentIndex(0);
  frame = itemView.get('frame');
  layer = itemView.get('layer');

  ev = SC.Event.simulateEvent(layer, 'mousedown', { clientX: frame.x, clientY: frame.y });
  SC.Event.trigger(layer, 'mousedown', [ev]);

  var f = function() {
    var halfWidth,
      itemView2,
      point;

    ev = SC.Event.simulateEvent(layer, 'mousemove');
    SC.Event.trigger(layer, 'mousemove', [ev]);

    // Drag over 2nd item
    itemView2 = gridView.itemViewForContentIndex(1);
    layer = itemView2.get('layer');
    point = SC.offset(layer);

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + 1, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);

    ok(gridView._insertionPointView, "An insertion point should have been added");

    // cancel drag
    ev = SC.Event.simulateEvent(layer, 'keydown', { keyCode: 27 });
    SC.Event.trigger(layer, 'keydown', [ev]);

    equals(gridView._insertionPointView, null, "The insertion point should have been destroyed");
    equals(gridView._didCallDragEnded, true, "dragEnded should have been call");

    start();
  };

  stop(); // stops the test runner
  setTimeout(f, 200);
});
