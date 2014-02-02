// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// Note that as of 1.10, the SC.CollectionView fast path is turned on by default.

var pane = SC.ControlTestPane.design()
  .add('group-item-test', SC.CollectionView, {
      content: [
        SC.Object.create({ title: 'a' }),
        SC.Object.create({ title: 'b' })
      ]
  });

module("SC.CollectionView fast path", {
  setup: function() {
    pane.standardSetup().setup();
  },

  teardown: function() {
    pane.standardSetup().teardown();
  }
});


/**
  There was a bug that if you called itemViewForContentIndex() on a fast-path
  SC.CollectionView BEFORE it was visible, it would throw an exception (because
  this._mapView wasn't initialized properly in fast-path mode).
*/
test("Calling itemViewForContentIndex() before the Collection is visible.", function() {
  var view;
  SC.run(function() {
    view = SC.CollectionView.create({
      content: "a b c d e f".w().map(function(x) {
        return SC.Object.create({ title: x });
      }),
      // STUB: reloadIfNeeded
      reloadIfNeeded: CoreTest.stub('reloadIfNeeded', SC.CollectionView.prototype.reloadIfNeeded)
    });
  });

  try {
    var itemView = view.itemViewForContentIndex(0);
    ok(true, 'Requesting itemViewForContentIndex() should not throw an exception prior to reloadIfNeeded being called.');

    view.reloadIfNeeded.expect(0);
  } catch (ex) {
    ok(false, 'Requesting itemViewForContentIndex() should not throw an exception prior to reloadIfNeeded being called.');
  }

  // The next test just shows how that when isVisibleInWindow changes, causing
  // reloadIfNeeded to be called, then the request would succeed.
  try {
    SC.run(function () {
      view.createLayer();
      view._doAttach(document.body);
    });

    view.reloadIfNeeded.expect(1);
    itemView = view.itemViewForContentIndex(0);
    ok(true, 'Requesting itemViewForContentIndex() should not throw an exception after reloadIfNeeded being called.');
  } catch (ex) {
    ok(false, 'Requesting itemViewForContentIndex() should not throw an exception after reloadIfNeeded being called.');
  }

  view.destroy();
});

test("Changing a pooled item view's group view status.", function() {
  var view = pane.view('group-item-test'),
      childView = view.childViews[0];

  // Test the example view for isGroupView and 'sc-item'.
  ok(!childView.get('isGroupView'), 'Item view should have "isGroupView" property set to NO.');
  ok(childView.get('classNames').contains('sc-item'), 'Item view should have "sc-item" class in classNames list.');
  ok(!childView.get('classNames').contains('sc-group-item'), 'Item view should not have "sc-group-item" class in classNames list.');
  ok(childView.$().hasClass('sc-item'), 'Item view should have "sc-item" class on its element.');
  ok(!childView.$().hasClass('sc-group-item'), 'Item view should not have "sc-group-item" class on its element.');

  // Change all childViews to groups.
  view._contentIndexIsGroup = function() { return YES; };
  SC.run(function() {
    view.reload();
  });

  ok(childView.get('isGroupView'), 'Group view should have "isGroupView" property set to YES.');
  ok(!childView.get('classNames').contains('sc-item'), 'Group view should not have "sc-item" class in classNames list.');
  ok(childView.get('classNames').contains('sc-group-item'), 'Group view should have "sc-group-item" class in classNames list.');
  ok(!childView.$().hasClass('sc-item'), 'Group view should not have "sc-item" class on its element.');
  ok(childView.$().hasClass('sc-group-item'), 'Group view should have "sc-group-item" class on its element.');


});
