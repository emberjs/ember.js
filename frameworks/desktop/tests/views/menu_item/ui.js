// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */
var pane, menu, callCount = 0;

module("SC.MenuItemView", {
  setup: function() {
   pane = SC.MainPane.create({
     layout: { width: 100, height: 20, centerX: 0, centerY: 0 },
     childViews: 'button'.w(),

     button: SC.ButtonView.design({
       menuItemAction: function() {
         callCount += 1;
       }
     })
   }).append();

   pane.makeFirstResponder(pane.button);

   menu = SC.MenuPane.create({
     items: [
      { title: 'Send Action', action: 'menuItemAction' }
     ]
   });

   menu.popup(pane.anchor);
  },

  teardown: function() {
    pane.remove();
    menu.remove();
    pane = menu = null;
  }
});

test('Sending an action with no target', function() {
  var itemView = menu.get('menuItemViews')[0];
  itemView.sendAction();
  equals(callCount, 1, 'firstResponder of main pane should be called');
});
