// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view, content ;

module("SC.CollectionView#reload (unattached)", {
  setup: function () {
    content = "1 2 3 4 5 6 7 8 9 10".w().map(function(x) {
      return SC.Object.create({ value: x });
    });

    view = SC.CollectionView.create({
      content: content
    });
  },

  teardown: function () {
    view.destroy();
    view = content = null;
  }
});


test("should only reload when isVisibleInWindow", function() {
  var len = view.getPath('childViews.length');

  SC.run(function() {
    view.reload();
  });

  equals(view.getPath('childViews.length'), len, 'view.childViews.length should not change while offscreen');

  SC.run(function() {
    view.createLayer();
    view._doAttach(document.body);
  });

  equals(view.getPath('childViews.length'), content.get('length'), 'view.childViews.length should change when moved onscreen if reload is pending');
});


module("SC.CollectionView.reload (attached)", {
  setup: function () {
    content = "1 2 3 4 5 6 7 8 9 10".w().map(function(x) {
      return SC.Object.create({ value: x });
    });

    view = SC.CollectionView.create({
      content: content,
      exampleView: SC.View.extend({
        isReusable: false
      }),

      // STUB: reload
      reload: CoreTest.stub('reload', SC.CollectionView.prototype.reload)
    });

    SC.run(function() {
      view.createLayer();
      view._doAttach(document.body);
    });
  },

  teardown: function () {
    view.destroy();
    view = content = null;
  }
});

/*
  Verifies that the item views for the passed collection view match exactly the
  content array passed.  If shouldShowAllContent is also YES then verifies
  that the nowShowing range is showing the entire content range.

  @param {SC.CollectionView} view the view to test
  @param {SC.Array} content the content array
  @param {Boolean} shouldShowAllContent
  @param {String} testName optional test name
  @returns {void}
*/
function verifyItemViews(view, content, shouldShowAllContent, testName) {
  var nowShowing = view.get('nowShowing'),
      childViews = view.get('childViews');

  if (testName === undefined) testName = '';

  if (shouldShowAllContent) {
    ok(nowShowing.isEqual(SC.IndexSet.create(0, content.get('length'))), '%@ nowShowing (%@) should equal (0..%@)'.fmt(testName, nowShowing, content.get('length')-1));
  }

  equals(childViews.get('length'), nowShowing.get('length'), '%@ view.childViews.length should match nowShowing.length'.fmt(testName));

  var iter= 0;
  nowShowing.forEach(function(idx) {
    var itemView = view.itemViewForContentIndex(idx),
        item     = content.objectAt(idx);

    if (itemView) {
      equals(itemView.get('content'), item, '%@ childViews[%@].content should equal content[%@]'.fmt(testName, iter,idx));
    }
    iter++;
  });
}

// ..........................................................
// BASIC TESTS
//

test("should automatically reload if content is set when collection view is first created", function() {
  ok(view.get('content'), 'precond - should have content');

  verifyItemViews(view, content, YES);
});

test("should automatically reload if isEnabled changes", function() {
  ok(view.get('content'), 'precond - should have content');

  view.reload.reset();
  view.set('isEnabled', false);
  view.reload.expect(1);
  view.set('isEnabled', true);
  view.reload.expect(2);
  verifyItemViews(view, content, YES);
});

test("reload(null) should generate item views for all items", function() {

  SC.run(function() {
    view.reload();
  });

  verifyItemViews(view, content, YES);
});

test("reload(index set) should update item view for items in index only", function() {

  // make sure views are loaded first time
  SC.run(function() {
    view.reload();
  });

  // now get a couple of child views.
  var cv1 = view.childViews[1], cv2 = view.childViews[3];

  // and then reload them
  SC.run(function() { view.reload(SC.IndexSet.create(1).add(3)); });

  ok(cv1 !== view.childViews[1], 'view.childViews[1] should be new instance after view.reload(<1,3>) actual: %@ expected: %@'.fmt(view.childViews[1], cv1));
  ok(cv2 !== view.childViews[3], 'view.childViews[3] should be new instance after view.reload(<1,3>) actual: %@ expected: %@'.fmt(view.childViews[3], cv2));

  // verify integrity
  verifyItemViews(view, content, YES);
});

test("adding items to content should reload item views at end", function() {
  SC.run(function() {
    content.pushObject(SC.Object.create());
  });
  verifyItemViews(view, content, YES);
});

test("removing items from content should remove item views", function() {
  SC.run(function() {
    content.popObject();
  });
  verifyItemViews(view, content, YES);
});

// ..........................................................
// SPECIAL CASES
//

test("remove and readd item", function() {
  // first remove an item.
  var item = content.objectAt(0);
  SC.run(function() { content.removeAt(0); });
  verifyItemViews(view, content, YES, 'after content.removeAt(0)');

  // then readd the item
  SC.run(function() { content.insertAt(0, item); });
  verifyItemViews(view, content, YES, 'after content.insertAt(0,item)');

  // then add another item
  item = SC.Object.create();
  SC.run(function() { content.pushObject(item); });
  verifyItemViews(view, content, YES, 'after content.pushObject(item)');

  // and remove the item
  SC.run(function() { content.popObject(); });
  verifyItemViews(view, content, YES, 'after content.popObject(item)');

});

