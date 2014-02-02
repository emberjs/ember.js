// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/*global module test htmlbody ok equals same stop start */

var items = [
  { title: 'Menu Item', keyEquivalent: 'ctrl_shift_n' },
  { title: 'Checked Menu Item', isChecked: YES, keyEquivalent: 'ctrl_a' },
  { title: 'Selected Menu Item', keyEquivalent: 'backspace' },
  { isSeparator: YES },
  { title: 'Menu Item with Icon', icon: 'inbox', keyEquivalent: 'ctrl_m' },
  { title: 'Menu Item with Icon', icon: 'folder', keyEquivalent: 'ctrl_p' },
  { isSeparator: YES },
  { title: 'Selected Menu Item…', isChecked: YES, keyEquivalent: 'ctrl_shift_o' },
  { title: 'Item with Submenu', subMenu: [{ title: 'Submenu item 1' }, { title: 'Submenu item 2'}] },
  { title: 'Disabled Menu Item', isEnabled: NO }//,
  // { isSeparator: YES },
  // { groupTitle: 'Menu Label', items: [{ title: 'Nested Item' }, { title: 'Nested Item' }] }
];

var menu, anchor;

module('SC.MenuPane Methods', {
  setup: function() {
    menu = SC.MenuPane.create({
      layout: { width: 206 },
      items: items,

      displayItemsCount: 0,
      displayItemsDidChange: function() {
        this.displayItemsCount++;
      }.observes('displayItems')
    });

    anchor = SC.Pane.create({
      layout: { top: 15, left: 15, width: 100, height: 100 }
    });
  },

  teardown: function() {
    menu.remove();
    anchor.remove();
    if (!menu.isDestroyed) { menu.destroy(); }
    anchor.destroy();
    menu = anchor = null;
  }
});

test('popup() without anchor', function(){
  var layout;

  menu.popup();
  layout = menu.get('layout');
  equals(layout.centerX, 0, 'menu should be horizontally centered');
  equals(layout.centerY, 0, 'menu should be vertically centered');
  equals(layout.width, 206, 'menu should maintain the width specified');
  equals(layout.height, 184, 'menu height should resize based on item content');
  menu.remove();
});

test('popup() with anchor', function(){
  var layout;

  anchor.append();
  menu.popup(anchor);
  layout = menu.get('layout');
  equals(layout.left, 16, 'menu should be aligned to the left of the anchor');
  equals(layout.top, 119, 'menu should be positioned below the anchor');
  equals(layout.width, 206, 'menu should maintain the width specified');
  equals(layout.height, 184, 'menu height should resize based on item content');
  menu.remove();
});

test('displayItems', function() {
  var strings = ['Alpha', 'Beta', 'Gaga'], output, count;

  menu.menuHeight = 1;
  menu.set('items', strings);
  equals(menu.displayItemsCount, 1, 'displayItems should change when items array changes');
  ok(menu.get('menuHeight') > 1, 'menuHeight should be recalculated when displayItems changes');

  output = menu.get('displayItems')[0];
  equals(SC.typeOf(output), SC.T_OBJECT, 'strings should be transformed into objects');
  equals(output.title, 'Alpha', 'title property of transformed object should match original string');
  equals(output.value, 'Alpha', 'value property of transformed object should match original string');
  equals(output.isEnabled, YES, 'isEnabled property of transformed object should be YES');

  var hashes = [
    { title: 'Yankee' },
    { title: 'Hotel' },
    { title: 'Foxtrot' } ];
  menu.set('items', hashes);

  output = menu.get('displayItems')[0];
  equals(SC.typeOf(output), SC.T_OBJECT, 'displayItems should convert hashes to objects');
  equals(output.get('title'), 'Yankee', 'object properties should correspond to hash properties');

  var objects = [
    SC.Object.create({ title: 'Whiskey' }),
    SC.Object.create({ title: 'Mystics' }),
    SC.Object.create({ title: 'Men' })
  ];
  menu.set('items', objects);

  output = menu.get('displayItems')[0];
  equals(SC.typeOf(output), SC.T_OBJECT, 'displayItems should not convert objects');
  equals(SC.guidFor(output), SC.guidFor(objects[0]), 'objects should be identical to provided objects');
});

test('displayItems - Edge Cases', function() {
  menu.set('items', [null, null, false, 0, 'Real Item']);

  var output = menu.get('displayItems');
  equals(output.get('length'), 1, 'displayItems should strip out invalid items');

  menu.set('items', ['Yellow', { title: 'Country' }, SC.Object.create({ title: 'Teeth' })]);
  output = menu.get('displayItems');

  ok(output[0].title === 'Yellow' && output[1].title === 'Country' && output[2].title === 'Teeth',
     'displayItems should accept a mix of supported item types');

  menu.set('items', []);
  equals(menu.getPath('displayItems.length'), 0, 'displayItems should be empty if items is empty');
  menu.set('items', null);
  equals(menu.get('displayItems'), null, 'displayItems should be null if items is null');
});

test('menuItemViewForContentIndex', function() {
  menu.popup();
  var view = menu.menuItemViewForContentIndex(0);
  equals(items[0].title, view.$('.value').text(), 'menu item views should match content items');
});


/** There was a bug that destroying the menu pane failed to destroy its internally
  created menu view. */
test('destroy should destroy the menu view', function () {
  var menuView = menu._menuView,
    menuItemView = menu.get('menuItemViews')[0];

  menu.popup();
  menu.destroy();

  ok(menuView.get('isDestroyed'), 'destroying the menu pane also destroys the menu view.');
  ok(menuItemView.get('isDestroyed'), 'destroying the menu pane also destroys the menu view child views.');
  ok(!menuView._menuView, "desroying the menu pane removes the internal reference to the menu view.");
})
