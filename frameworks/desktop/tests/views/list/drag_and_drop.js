// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  This test evaluates drag and drop support for SC.ListView
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
    contentView: SC.ListView.design({
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
  }))
  .add("empty", SC.ScrollView.design({
    borderStyle: SC.BORDER_NONE,
    layout: { left: 0, right: 0, top: 0, height: 300 },
    hasHorizontalScroller: NO,
    contentView: SC.ListView.design({
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


module("SC.ListView - drag and drop", pane.standardSetup());

test("drag on default list view", function() {
  var ev,
    itemView,
    layer,
    listView = pane.view("basic").get('contentView');

  itemView = listView.itemViewForContentIndex(0);
  layer = itemView.get('layer');
  ev = SC.Event.simulateEvent(layer, 'mousedown');
  SC.Event.trigger(layer, 'mousedown', [ev]);

  ev = SC.Event.simulateEvent(layer, 'mousemove');
  SC.Event.trigger(layer, 'mousemove', [ev]);

  equals(listView.get('dragContent'), null, 'dragContent should not be set, because the default implementation should prevent dragging');

  // Clean up
  ev = SC.Event.simulateEvent(layer, 'mouseup');
  SC.Event.trigger(layer, 'mouseup', [ev]);
});


test("drag on list view with SC.DROP_ON support", function() {
  var ev,
    itemView,
    layer,
    listView = pane.view("basic").get('contentView');

  // Configure the view to accept drop on.
  listView.set('canReorderContent', YES);
  listView.set('isDropTarget', YES);
  listView.set('delegate', SC.Object.create(SC.CollectionViewDelegate, {
     collectionViewValidateDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
      return SC.DRAG_ANY;
    }
  }));

  itemView = listView.itemViewForContentIndex(0);
  layer = itemView.get('layer');
  ev = SC.Event.simulateEvent(layer, 'mousedown');
  SC.Event.trigger(layer, 'mousedown', [ev]);

  var f = function() {
    var itemView2,
      point;

    SC.RunLoop.begin();
    ev = SC.Event.simulateEvent(layer, 'mousemove');
    SC.Event.trigger(layer, 'mousemove', [ev]);

    equals(listView.get('dragContent').content, listView.get('content'), "dragContent.content should be equal to the ListView's content");
    ok(listView.get('dragContent').indexes.isEqual(SC.IndexSet.create(0)), "dragContent.indexes should be equal to indexes equal to [{0}]");
    SC.RunLoop.end();

    // Drag over 2nd item
    itemView2 = listView.itemViewForContentIndex(1);
    layer = itemView2.get('layer');
    point = SC.offset(layer);

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + 1, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);


    ok(itemView2.get('isDropTarget'), "second list item should have isDropTarget set to true");

    // This test only works because SC.ListItemView supports adding the class to match the property.
    ok(itemView2.$().hasClass('drop-target'), "second list item should add drop-target class");

    // Drag over 3rd item
    itemView = listView.itemViewForContentIndex(2);
    layer = itemView.get('layer');
    point = SC.offset(layer);

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + 1, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);

    ok(itemView.get('isDropTarget'), "third list item should have isDropTarget set to true");
    ok(!itemView2.get('isDropTarget'), "second list item should not have isDropTarget set to true");

    // This test only works because SC.ListItemView supports adding the class to match the property.
    ok(itemView.$().hasClass('drop-target'), "third list item should add drop-target class");
    ok(!itemView2.$().hasClass('drop-target'), "second list item should not add drop-target class");

    // Clean up
    ev = SC.Event.simulateEvent(layer, 'mouseup');
    SC.Event.trigger(layer, 'mouseup', [ev]);

    window.start();
  };

  stop(); // stops the test runner
  setTimeout(f, 200);
});

test("insertion point when drag on list view", function() {
  var ev,
    itemView,
    layer,
    listView = pane.view("basic").get('contentView');

  listView.set('canReorderContent', YES);

  itemView = listView.itemViewForContentIndex(0);
  layer = itemView.get('layer');
  ev = SC.Event.simulateEvent(layer, 'mousedown');
  SC.Event.trigger(layer, 'mousedown', [ev]);

  var f = function() {
    var itemView2,
      point;

    SC.RunLoop.begin();
    ev = SC.Event.simulateEvent(layer, 'mousemove');
    SC.Event.trigger(layer, 'mousemove', [ev]);

    // Drag over 2nd item
    itemView2 = listView.itemViewForContentIndex(1);
    layer = itemView2.get('layer');
    point = SC.offset(layer);

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + 1, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);

    ok(listView._insertionPointView, "An insertion point should have been added");

    // Clean up
    ev = SC.Event.simulateEvent(layer, 'mouseup');
    SC.Event.trigger(layer, 'mouseup', [ev]);

    equals(listView._insertionPointView, null, "The insertion point should have been destroyed");

    window.start();
  };

  stop(); // stops the test runner
  setTimeout(f, 200);
});

test("insertion point when cancel drag on list view", function() {
  var ev,
    itemView,
    layer,
    listView = pane.view("basic").get('contentView');

  listView.set('canReorderContent', YES);

  itemView = listView.itemViewForContentIndex(0);
  layer = itemView.get('layer');
  ev = SC.Event.simulateEvent(layer, 'mousedown');
  SC.Event.trigger(layer, 'mousedown', [ev]);

  var f = function() {
    var itemView2,
      point;

    SC.RunLoop.begin();
    ev = SC.Event.simulateEvent(layer, 'mousemove');
    SC.Event.trigger(layer, 'mousemove', [ev]);

    // Drag over 2nd item
    itemView2 = listView.itemViewForContentIndex(1);
    layer = itemView2.get('layer');
    point = SC.offset(layer);

    ev = SC.Event.simulateEvent(layer, 'mousemove', { pageX: point.x + 1, pageY: point.y + 1 });
    SC.Event.trigger(layer, 'mousemove', [ev]);

    ok(listView._insertionPointView, "An insertion point should have been added");

    // cancel drag
    ev = SC.Event.simulateEvent(layer, 'keydown', { keyCode: 27 });
    SC.Event.trigger(layer, 'keydown', [ev]);

    equals(listView._insertionPointView, null, "The insertion point should have been destroyed");
    equals(listView._didCallDragEnded, true, "dragEnded should have been call");

    window.start();
  };

  stop(); // stops the test runner
  setTimeout(f, 200);
});

test("insertion point on empty list", function() {
  var listView = pane.view('empty').get('contentView'),
      didError = NO;

  try {
    SC.run(function() {
      listView.showInsertionPoint(null, SC.DRAG_MOVE);
    });
  } catch (e) {
    didError = YES;
  }

  ok(!didError, "An insertion point was added onto no item view without incident.");
});
