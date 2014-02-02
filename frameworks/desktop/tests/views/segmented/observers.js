// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

var pane, view, view2, item1, item2, item3;

module("SC.SegmentedView observers", {
  setup: function() {
    SC.RunLoop.begin();
    item1 = SC.Object.create({ value: "Item1" });
    item2 = SC.Object.create({ value: "Item2" });
    item3 = SC.Object.create({ value: "Item3" });
    item4 = {value: 'ItemX'};
    item5 = {value: 'ItemY'};
    item6 = {value: 'ItemZ'};
    pane = SC.MainPane.create({
      childViews: [
        SC.SegmentedView.extend({
          items: [item1, item2, item3],
          itemTitleKey: 'value',
          itemValueKey: null,
          itemActionKey: 'action',
          value: null,
          allowsEmptySelection: YES,
          layout: { height: 25, width: 400 }
        }),
        SC.SegmentedView.extend({
          items: [item4, item5, item6],
          itemTitleKey: 'value',
          itemValueKey: null,
          itemActionKey: 'action',
          value: null,
          allowsEmptySelection: YES,
          layout: { height: 25, width: 400 }
        })]
    });
    pane.append(); // make sure there is a layer...
    SC.RunLoop.end();

    view = pane.childViews[0];
    view2 = pane.childViews[1];
  },

  teardown: function() {
    pane.remove();
    pane = view = view2 = null ;
  }
});

test("Check that observers are removed properly", function() {
  ok(item1.hasObserverFor('value'), 'Item1 should be observed');
  ok(item2.hasObserverFor('value'), 'Item2 should be observed');
  ok(item3.hasObserverFor('value'), 'Object2 should be observed');

  SC.RunLoop.begin();
  view.items.removeObject(item1);
  view2.items.removeObject(item4);
  SC.RunLoop.end();

  ok(!item1.hasObserverFor('value'), 'Item1 should not be observed');
  ok(item2.hasObserverFor('value'), 'Item2 should be observed');
  ok(item3.hasObserverFor('value'), 'Item3 should be observed');

  SC.RunLoop.begin();
  view.items.removeObject(item3);
  view2.items.removeObject(item5);
  SC.RunLoop.end();

  ok(!item1.hasObserverFor('value'), 'Item1 should not be observed');
  ok(item2.hasObserverFor('value'), 'Item2 should be observed');
  ok(!item3.hasObserverFor('value'), 'Item3 should not be observed');

});
