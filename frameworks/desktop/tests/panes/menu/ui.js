// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright ©2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, ok, equals, stop, start */

var items = [
  { title: 'Menu Item', keyEquivalent: 'ctrl_shift_n' },
  { title: 'Checked Menu Item', isChecked: YES, keyEquivalent: 'ctrl_a' },
  { title: 'Selected Menu Item', keyEquivalent: 'backspace' },
  { isSeparator: YES },
  { title: 'Menu Item with Icon', icon: 'inbox', keyEquivalent: 'ctrl_m' },
  { title: 'Menu Item with Icon', icon: 'folder', keyEquivalent: ['ctrl_p', 'ctrl_f'] },
  { isSeparator: YES },
  { title: 'Selected Menu Item…', isChecked: YES, keyEquivalent: 'ctrl_shift_o' },
  { title: 'Item with Submenu', subMenu: [{ title: 'Submenu item 1' }, { title: 'Submenu item 2'}] },
  { title: 'Disabled Menu Item', isEnabled: NO },
  { isSeparator: YES },
  { title: 'Unique Menu Item Class Per Item', exampleView: SC.MenuItemView.extend({
      classNames: 'custom-menu-item'.w()
    }) }
  // { isSeparator: YES },
  // { groupTitle: 'Menu Label', items: [{ title: 'Nested Item' }, { title: 'Nested Item' }] }
  ];

var menu;

module('SC.MenuPane UI', {
  setup: function () {
    SC.run(function () {
      menu = SC.MenuPane.create({
        layout: { width: 206 },

        selectedItemChanged: function () {
          this._selectedItemCount = (this._selectedItemCount || 0) + 1;
        }.observes('selectedItem'),

        countAction: function () {
          this._actionCount = (this._actionCount || 0) + 1;
        }
      });

      items[0].target = menu;
      items[0].action = 'countAction';

      items[1].action = function () {
        menu._functionActionCount = (menu._functionActionCount || 0) + 1;
      };

      menu.set('items', items);
    });
  },

  teardown: function () {
    SC.run(function () {
      menu.destroy();
    });
    menu = null;
  }
});

/**
  Simulates clicking on the specified view.

  @param {SC.View} view the view
  @param {Boolean} [shiftKey] simulate shift key pressed
  @param {Boolean} [ctrlKey] simulate ctrlKey pressed
*/
function clickOn(view, shiftKey, ctrlKey) {
  var layer    = view.get('layer'),
      opts     = { shiftKey: !!shiftKey, ctrlKey: !!ctrlKey },
      ev;

  ok(layer, 'clickOn() precond - view %@ should have layer'.fmt(view.toString()));

  ev = SC.Event.simulateEvent(layer, 'mousedown', opts);
  SC.Event.trigger(layer, 'mousedown', [ev]);

  ev = SC.Event.simulateEvent(layer, 'mouseup', opts);
  SC.Event.trigger(layer, 'mouseup', [ev]);
  SC.RunLoop.begin().end();
  layer = null;
}

/**
  Simulates a key press on the specified view.

  @param {SC.View} view the view
  @param {Number} keyCode key to simulate
  @param {Boolean} [isKeyPress] simulate key press event
  @param {Boolean} [shiftKey] simulate shift key pressed
  @param {Boolean} [ctrlKey] simulate ctrlKey pressed
*/
function keyPressOn(view, keyCode, isKeyPress, shiftKey, ctrlKey) {
  var layer    = view.get('layer'),
    opts     = {
      shiftKey: !!shiftKey,
      ctrlKey: !!ctrlKey,
      keyCode: keyCode,
      charCode: isKeyPress ? keyCode : 0,
      which: keyCode
    },
    ev;

  ok(layer, 'keyPressOn() precond - view %@ should have layer'.fmt(view.toString()));

  ev = SC.Event.simulateEvent(layer, 'keydown', opts);
  SC.Event.trigger(layer, 'keydown', [ev]);

  if (isKeyPress) {
    ev = SC.Event.simulateEvent(layer, 'keypress', opts);
    SC.Event.trigger(layer, 'keypress', [ev]);
  }

  ev = SC.Event.simulateEvent(layer, 'keyup', opts);
  SC.Event.trigger(layer, 'keyup', [ev]);
  SC.RunLoop.begin().end();
  layer = null;
}

test('Basic UI', function () {
  SC.run(function () {
    menu.popup();
  });
  ok(menu.$().hasClass('sc-menu'), 'pane should have "sc-menu" class');
  ok(menu.$().hasClass('sc-regular-size'), 'pane should have default control size class');
  ok(!menu.get('isSubMenu'), 'isSubMenu should be NO on menus that are not submenus');
  var menuItem = menu.get('menuItemViews')[0], selectedItem;
  menuItem.mouseEntered();
  clickOn(menuItem, NO, NO);
  stop();

  setTimeout(function () {
    selectedItem = menu.get('selectedItem');
    ok(selectedItem, 'menu should have selectedItem property set after clicking on menu item');
    equals(selectedItem ? selectedItem.title : null, menuItem.get('content').title, 'selectedItem should be set to the content item that was clicked');
    equals(1, menu._selectedItemCount, 'selectedItem should only change once when a menu item is clicked');
    equals(1, menu._actionCount, 'action is fired once when menu item is clicked');
    SC.run(function () {
      menu.remove();
    });
    ok(!menu.get('isVisibleInWindow'), 'menu should not be visible after being removed');
    equals(menu.get('currentMenuItem'), null, 'currentMenuItem should be null after being removed');
    start();
  }, 250);
});

test('Control size', function () {
  var smallPane, largePane, views, items = [
    { title: 'Can I get get get' },
    { title: 'To know know know know', isSeparator: YES },
    { title: 'Ya better better baby' }
  ];

  SC.run(function () {
    smallPane = SC.MenuPane.create({
      controlSize: SC.SMALL_CONTROL_SIZE,
      items: items
    });

    smallPane.popup();
  });
  views = smallPane.get('menuItemViews');

  var small_constants = SC.BaseTheme.menuRenderDelegate['sc-small-size'];
  equals(views[0].get('frame').height, small_constants.itemHeight, 'should change itemHeight');
  equals(views[1].get('frame').height, small_constants.itemSeparatorHeight, 'should change itemSeparatorHeight');
  equals(views[0].get('frame').y, small_constants.menuHeightPadding / 2, 'should change menuHeightPadding');
  SC.run(function () {
    smallPane.remove();
  });

  SC.run(function () {
    largePane = SC.MenuPane.create({
      controlSize: SC.LARGE_CONTROL_SIZE,
      items: items
    });

    largePane.popup();
  });
  views = largePane.get('menuItemViews');

  var large_constants = SC.BaseTheme.menuRenderDelegate['sc-large-size'];
  equals(views[0].get('frame').height, large_constants.itemHeight, 'should change itemHeight');
  equals(views[1].get('frame').height, large_constants.itemSeparatorHeight, 'should change itemSeparatorHeight');
  equals(views[0].get('frame').y, large_constants.menuHeightPadding / 2, 'should change menuHeightPadding');

  SC.run(function () {
    largePane.remove();
  });
});

test('Legacy Function Support', function () {
  SC.run(function () {
    menu.popup();
  });
  var menuItem = menu.get('menuItemViews')[1], selectedItem;
  menuItem.mouseEntered();
  clickOn(menuItem, NO, NO);
  stop();

  setTimeout(function () {
    selectedItem = menu.get('selectedItem');
    equals(1, menu._functionActionCount, 'Function should be called if it is set as the action and the menu item is clicked');

    SC.run(function () {
      menu.remove();
    });
    start();
  }, 250);
});

test('Custom MenuItemView Class', function () {
  equals(menu.get('exampleView'), SC.MenuItemView, 'SC.MenuPane should generate SC.MenuItemViews by default');
  var menu2;

  SC.run(function () {
    menu2 = SC.MenuPane.create({
      exampleView: SC.MenuItemView.extend({
        classNames: 'custom-menu-item'.w()
      }),

      items: items
    });

    menu2.popup();
  });
  ok(menu2.$('.custom-menu-item').length > 0, 'SC.MenuPane should generate instances of custom classes if exampleView is changed');
  SC.run(function () {
    menu2.remove();
  });
});


test('Custom MenuItemView Class on an item using itemExampleViewKey', function () {
  equals(menu.get('exampleView'), SC.MenuItemView, 'SC.MenuPane should generate SC.MenuItemViews by default');
  SC.run(function () {
    menu.popup();
  });
  ok(menu.$('.custom-menu-item').length === 1, 'SC.MenuPane should generate one instance of a custom class if the item has an exampleView property');
  ok(SC.$(SC.$('.sc-menu-item')[11]).hasClass('custom-menu-item'), 'The last menu item should have a custom class');

  SC.run(function () {
    menu.remove();
  });
});

test('Basic Submenus', function () {
  var smallMenu,
    menuItem, subMenu;

  SC.run(function () {
    smallMenu = SC.MenuPane.create({
      controlSize: SC.SMALL_CONTROL_SIZE,
      items: items
    });
    menuItem = smallMenu.get('menuItemViews')[8];

    smallMenu.popup();
  });

  menuItem.mouseEntered();
  SC.RunLoop.begin().end();
  ok(menuItem.get('hasSubMenu'), 'precond - menu item has a submenu');
  subMenu = menuItem.get('subMenu');
  ok(!subMenu.get('isVisibleInWindow'), 'submenus should not open immediately');
  stop();
  setTimeout(function () {
    ok(subMenu.get('isVisibleInWindow'), 'submenu should open after 100ms delay');
    ok(subMenu.get('isSubMenu'), 'isSubMenu should be YES on submenus');
    ok(subMenu.get('controlSize'), SC.SMALL_CONTROL_SIZE, "submenu should inherit parent's controlSize");
    SC.run(function () {
      smallMenu.remove();
    });
    ok(!subMenu.get('isVisibleInWindow'), 'submenus should close if their parent menu is closed');
    start();
  }, 150);
});

test('Menu Item Localization', function () {
  ok(menu.get('localize'), 'menu panes should be localized by default');
  var locMenu, items;

  SC.stringsFor('en', { 'Localized.Text': 'LOCALIZED TEXT' });
  items = [ 'Localized.Text' ];

  SC.run(function () {
    locMenu = SC.MenuPane.create({
      layout: { width: 200 },
      items: items,
      localize: NO
    });

    locMenu.popup();
  });
  equals('Localized.Text', locMenu.$('.sc-menu-item .value').text(), 'Menu item titles should not be localized if localize is NO');

  SC.run(function () {
    locMenu.remove();
  });

  SC.run(function () {
    locMenu = SC.MenuPane.create({
      items: items,
      localize: YES
    });

    locMenu.popup();
  });
  equals('LOCALIZED TEXT', locMenu.$('.sc-menu-item .value').text(), 'Menu item titles should be localized if localize is YES');
  SC.run(function () {
    locMenu.remove();
  });
});

test('Automatic Closing', function () {

  SC.run(function () {
    menu.popup();
  });
  ok(menu.get('isVisibleInWindow'), 'precond - window should be visible');
  SC.run(function () {
    menu.windowSizeDidChange();
  });
  ok(!menu.get('isVisibleInWindow'), 'menu should close if window resizes');

  SC.run(function () {
    menu.popup();
  });
  clickOn(menu);
  ok(!menu.get('isVisibleInWindow'), 'menu should close if anywhere other than a menu item is clicked');
});

test('keyEquivalents', function () {
  var keyEquivalents = menu._keyEquivalents;

  // verify that keyEquivalents were mapped correctly and that multiple
  // keyEquivalents work
  menu.items.forEach(function (item) {
    var keyEq = item.keyEquivalent, idx, len;
    if (!keyEq) return;

    if (SC.typeOf(keyEq) === SC.T_ARRAY) {
      for (idx = 0, len = keyEq.length; idx < len; idx++) {
        ok(keyEquivalents[keyEq[idx]], "keyEquivalent should map to " + keyEq[idx]);
      }
    }
    else {
      ok(keyEquivalents[keyEq], "keyEquivalent should map to " + keyEq);
    }
  });
});

test('scrolling', function () {
  var currentMenuItem;

  SC.run(function () {
    menu.popup();
  });
  menu.set('currentMenuItem', menu.get('menuItemViews')[0]);
  currentMenuItem = menu.get('currentMenuItem');
  equals(currentMenuItem.get('title'), 'Menu Item', 'menu should begin at first item');

  keyPressOn(menu, SC.Event.KEY_DOWN);
  currentMenuItem = menu.get('currentMenuItem');
  equals(currentMenuItem.get('title'), 'Checked Menu Item', 'arrow down should move one item down');

  keyPressOn(menu, SC.Event.KEY_UP);
  currentMenuItem = menu.get('currentMenuItem');
  equals(currentMenuItem.get('title'), 'Menu Item', 'arrow up should move one item up');

  keyPressOn(menu, SC.Event.KEY_PAGEDOWN);
  currentMenuItem = menu.get('currentMenuItem');
  equals(currentMenuItem.get('title'), 'Unique Menu Item Class Per Item', 'page down should move one page down');

  keyPressOn(menu, SC.Event.KEY_PAGEUP);
  currentMenuItem = menu.get('currentMenuItem');
  equals(currentMenuItem.get('title'), 'Menu Item', 'page up should move one page up');

  keyPressOn(menu, SC.Event.KEY_END);
  currentMenuItem = menu.get('currentMenuItem');
  equals(currentMenuItem.get('title'), 'Unique Menu Item Class Per Item', 'end should move to the last item');

  keyPressOn(menu, SC.Event.KEY_HOME);
  currentMenuItem = menu.get('currentMenuItem');
  equals(currentMenuItem.get('title'), 'Menu Item', 'home should move to the first item');
});

test('aria-role attribute', function () {
  var menuPane, menuItems, normalItem, itemWithCheckBox, separatorItem;

  SC.run(function () {
    menuPane = SC.MenuPane.create({
      layout: { width: 200 },
      items: items,
      itemCheckboxKey: 'isChecked'
    });

    menuPane.popup();
  });

  equals(menuPane.$().attr('role'), 'menu', "menu pane should have role set");

  menuItems = menuPane.get('menuItemViews');
  normalItem        = menuItems[0];
  itemWithCheckBox  = menuItems[1];
  separatorItem     = menuItems[3];

  equals(normalItem.$().attr('role'), 'menuitem', "normal menuitem has correct role set");
  equals(itemWithCheckBox.$().attr('role'), 'menuitemcheckbox', "menuitem with checkbox has correct role set");
  equals(separatorItem.$().attr('role'), 'separator', "separator menuitem has correct role set");
  clickOn(menuPane);
});

test('aria-checked attribute', function () {
  var menuPane,
    itemWithCheckBox;

  SC.run(function () {
    menuPane = SC.MenuPane.create({
      layout: { width: 200 },
      items: items,
      itemCheckboxKey: 'isChecked'
    });

    menuPane.popup();
  });

  itemWithCheckBox = menuPane.get('menuItemViews')[1];

  equals(itemWithCheckBox.$().attr('aria-checked'), "true", "checked menuitem has aria-checked attribute set");
  clickOn(menuPane);
});

