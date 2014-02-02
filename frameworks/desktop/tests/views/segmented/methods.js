// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

var iconURL = sc_static("sproutcore-32.png");
var pane, view;

module("SC.SegmentedView", {
  setup: function() {
    SC.RunLoop.begin();
    pane = SC.MainPane.create({
      childViews: [
        SC.SegmentedView.extend({
          items: [
          { value: "Item1", icon: iconURL },
          { value: "Item2", icon: iconURL },
          { value: "Item3", icon: iconURL }],
          itemTitleKey: 'value',
          itemValueKey: 'value',
          itemIconKey: 'icon',
          itemActionKey: 'action',
          value: "Item1 Item3".w(),
          allowsEmptySelection: NO,
          layout: { height: 25, width: 400 }
        })]
    });
    pane.append(); // make sure there is a layer...
    SC.RunLoop.end();

    view = pane.childViews[0];
  },

  teardown: function() {
    pane.remove();
    pane = view = null ;
  }
});

test("Check that properties are mapped correctly", function() {
  view.triggerItemAtIndex(1);

  SC.RunLoop.begin();
  view.set('isEnabled', YES);
  SC.RunLoop.end();

  equals(view.get('value'), "Item2", "the second item should be selected.");

  var childViews = view.get('childViews');
  equals(childViews[0].title, "Item1", 'Computed properties should match');
  equals(childViews[0].value, "Item1", 'Computed properties should match');
  equals(childViews[0].isEnabled, true, 'Computed properties should match');
  equals(childViews[0].icon, iconURL, 'Computed properties should match');
  equals(childViews[0].width, null, 'Computed properties should match');
  equals(childViews[0].toolTip, null, 'Computed properties should match');
  equals(childViews[0].index, 0, 'Computed properties should match');
});


test("Check the values of value", function() {
  equals(SC.isArray(view.get('value')), true, "the value should initially be an array");
  equals(view.getPath('value.length'), 2, "the value array should have 2 items in it");
  view.triggerItemAtIndex(1);
  equals(SC.isArray(view.get('value')), false, "the value should not be an array if allowsMultipleSelection is false");
  equals(view.get('value'), "Item2", "the second item should be selected.");

  view.set('allowsMultipleSelection', true);
  view.triggerItemAtIndex(2);
  equals(SC.isArray(view.get('value')), true, "the value should be an array if allowsMultipleSelection is true");
  equals(view.getPath('value.length'), 2, "the value array should have 2 items in it");
  view.triggerItemAtIndex(1);
  equals(view.getPath('value.length'), 1, "the value array should have 1 item in it");
  view.triggerItemAtIndex(2);
  equals(view.getPath('value.length'), 1, "the value array should have 1 items in it, because allowsEmptySelection is false");

  view.set('allowsEmptySelection', true);
  view.triggerItemAtIndex(2);
  equals(view.getPath('value.length'), 0, "the value array should have 0 items in it,  because allowsEmptySelection is true");

  view.set('allowsMultipleSelection', false);
  view.triggerItemAtIndex(1);
  equals(SC.isArray(view.get('value')), false, "the value should not be an array if allowsMultipleSelection is false again");
  equals(view.get('value'), "Item2", "the second item should be selected.");
  view.triggerItemAtIndex(2);
  equals(view.get('value'), "Item3", "the third item should be selected.");

  view.set('allowsEmptySelection', false);
  view.triggerItemAtIndex(2);
  equals(view.get('value'), "Item3", "the third item should still be selected, because allowsEmptySelection is false");

  view.set('allowsEmptySelection', true);
  view.triggerItemAtIndex(2);
  equals(view.get('value'), null, "the value should go to null if allowsMultipleSelection is false and allowsEmptySelection is true.");
});
