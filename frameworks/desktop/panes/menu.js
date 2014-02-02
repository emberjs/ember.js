// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/picker');
sc_require('views/menu_item');

/**
  @class

  `SC.MenuPane` allows you to display a standard menu. Menus appear over other
  panes, and block input to other views until a selection is made or the pane
  is dismissed by clicking outside of its bounds.

  You can create a menu pane and manage it yourself, or you can use the
  `SC.SelectButtonView` and `SC.PopupButtonView` controls to manage the menu for
  you.

  ## Specifying Menu Items

  The menu pane examines the `items` property to determine what menu items
  should be presented to the user.

  In its most simple form, you can provide an array of strings. Every item
  will be converted into a menu item whose title is the string.

  If you need more control over the menu items, such as specifying a keyboard
  shortcut, enabled state, custom height, or submenu, you can provide an array
  of content objects.

  Out of the box, the menu pane has some default keys it uses to get
  information from the objects. For example, to find out the title of the menu
  item, the menu pane will ask your object for its `title` property. If you
  need to change this key, you can set the `itemTitleKey` property on the pane
  itself.

      var menuItems = [
        { title: 'Menu Item', keyEquivalent: 'ctrl_shift_n' },
        { title: 'Checked Menu Item', checkbox: YES, keyEquivalent: 'ctrl_a' },
        { title: 'Selected Menu Item', keyEquivalent: ['backspace', 'delete'] },
        { isSeparator: YES },
        { title: 'Menu Item with Icon', icon: 'inbox', keyEquivalent: 'ctrl_m' },
        { title: 'Menu Item with Icon', icon: 'folder', keyEquivalent: 'ctrl_p' }
      ];

      var menu = SC.MenuPane.create({
        items: menuItems
      });

  ## Observing User Selections

  To determine when a user clicks on a menu item, you can observe the
  `selectedItem` property for changes.

  @extends SC.PickerPane
  @since SproutCore 1.0
*/
SC.MenuPane = SC.PickerPane.extend(
/** @scope SC.MenuPane.prototype */ {

  /**
    @type Array
    @default ['sc-menu']
    @see SC.View#classNames
  */
  classNames: ['sc-menu'],

  /**
    The WAI-ARIA role for menu pane.

    @type String
    @default 'menu'
    @constant
  */
  ariaRole: 'menu',


  // ..........................................................
  // PROPERTIES
  //

  /**
    The array of items to display. This can be a simple array of strings,
    objects or hashes. If you pass objects or hashes, you can also set the
    various itemKey properties to tell the menu how to extract the information
    it needs.

    @type Array
    @default []
  */
  items: null,

  /**
    The size of the menu. This will set a CSS style on the menu that can be
    used by the current theme to style the appearance of the control. This
    value will also determine the default `itemHeight`, `itemSeparatorHeight`,
    `menuHeightPadding`, and `submenuOffsetX` if you don't explicitly set these
    properties.

    Your theme can override the default values for each control size by specifying
    them in the `menuRenderDelegate`. For example:

        MyTheme.menuRenderDelegate = SC.BaseTheme.menuRenderDelegate.create({
          'sc-tiny-size': {
            itemHeight: 20,
            itemSeparatorHeight: 9,
            menuHeightPadding: 6,
            submenuOffsetX: 2
          }
        });

    Changing the controlSize once the menu is instantiated has no effect.

    @type String
    @default SC.REGULAR_CONTROL_SIZE
  */
  controlSize: SC.REGULAR_CONTROL_SIZE,

  /**
    The height of each menu item, in pixels.

    You can override this on a per-item basis by setting the (by default)
    `height` property on your object.

    If you don't specify a value, the item height will be inferred from
    `controlSize`.

    @type Number
    @default itemHeight from theme if present, or 20.
  */
  itemHeight: SC.propertyFromRenderDelegate('itemHeight', 20),

  /**
    The height of separator menu items.

    You can override this on a per-item basis by setting the (by default)
    `height` property on your object.

    If you don't specify a value, the height of the separator menu items will
    be inferred from `controlSize`.

    @type Number
    @default itemSeparatorHeight from theme, or 9.
  */
  itemSeparatorHeight: SC.propertyFromRenderDelegate('itemSeparatorHeight', 9),

  /**
    The height of the menu pane. This is updated every time menuItemViews
    is recalculated.

    @type Number
    @default 0
    @isReadOnly
  */
  menuHeight: 0,

  /**
    The amount of padding to add to the height of the pane.

    The first menu item is offset by half this amount, and the other half is
    added to the height of the menu, such that a space between the top and the
    bottom is created.

    If you don't specify a value, the padding will be inferred from the
    controlSize.

    @type Number
    @default menuHeightPadding from theme, or 6
  */
  menuHeightPadding: SC.propertyFromRenderDelegate('menuHeightPadding', 6),

  /**
    The amount of offset x while positioning submenu.

    If you don't specify a value, the padding will be inferred from the
    controlSize.

    @type Number
    @default submenuOffsetX from theme, or 2
  */
  submenuOffsetX: SC.propertyFromRenderDelegate('submenuOffsetX', 2),

  /**
    The last menu item to be selected by the user.

    You can place an observer on this property to be notified when the user
    makes a selection.

    @type SC.Object
    @default null
    @isReadOnly
  */
  selectedItem: null,

  /**
    The view class to use when creating new menu item views.

    The menu pane will automatically create an instance of the view class you
    set here for each item in the `items` array. You may provide your own
    subclass for this property to display the customized content.

    @type SC.View
    @default SC.MenuItemView
  */
  exampleView: SC.MenuItemView,

  /**
    The view or element to which the menu will anchor itself.

    When the menu pane is shown, it will remain anchored to the view you
    specify, even if the window is resized. You should specify the anchor as a
    parameter when calling `popup()`, rather than setting it directly.

    @type SC.View
    @isReadOnly
  */
  anchor: null,

  /**
    `YES` if this menu pane was generated by a parent `SC.MenuPane`.

    @type Boolean
    @default NO
    @isReadOnly
  */
  isSubMenu: NO,

  /**
    Whether the title of menu items should be localized before display.

    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    Whether or not this menu pane should accept the “current menu pane”
    designation when visible, which is the highest-priority pane when routing
    events.  Generally you want this set to `YES` so that your menu pane can
    intercept keyboard events.

    @type Boolean
    @default YES
  */
  acceptsMenuPane: YES,

  /**
    Disable context menu.

    @type Boolean
    @default NO
  */
  isContextMenuEnabled: NO,


  // ..........................................................
  // METHODS
  //

  /**
    Makes the menu visible and adds it to the HTML document.

    If you provide a view or element as the first parameter, the menu will
    anchor itself to the view, and intelligently reposition itself if the
    contents of the menu exceed the available space.

    @param {SC.View} anchorViewOrElement the view or element to which the menu
    should anchor.
    @param {Array} (preferMatrix) The prefer matrix used to position the pane.
  */
  popup: function (anchorViewOrElement, preferMatrix) {
    this.beginPropertyChanges();
    if (anchorViewOrElement) {
      if (anchorViewOrElement.isView) {
        this._anchorView = anchorViewOrElement;
        this._setupScrollObservers(anchorViewOrElement);
      } else {
        this._anchorHTMLElement = anchorViewOrElement;
      }
    }
   // this.set('anchor',anchorViewOrElement);
    if (preferMatrix) this.set('preferMatrix', preferMatrix);

    this.adjust('height', this.get('menuHeight'));
    this.positionPane();

    // Because panes themselves do not receive key events, we need to set the
    // pane's defaultResponder to itself. This way key events can be
    // interpreted in keyUp.
    this.set('defaultResponder', this);
    this.endPropertyChanges();

    // Prevent body overflow (we don't want to overflow because of shadows).
    SC.bodyOverflowArbitrator.requestHidden(this, true);

    this.append();
  },

  // ..........................................................
  // ITEM KEYS
  //

  /**
    The name of the property that contains the title for each item.

    @type String
    @default "title"
    @commonTask Menu Item Properties
  */
  itemTitleKey: 'title',

  /**
    The name of the property that determines whether the item is enabled.

    @type String
    @default "isEnabled"
    @commonTask Menu Item Properties
  */
  itemIsEnabledKey: 'isEnabled',

  /**
    The name of the property that contains the value for each item.

    @type String
    @default "value"
    @commonTask Menu Item Properties
  */
  itemValueKey: 'value',

  /**
    The name of the property that contains the icon for each item.

    @type String
    @default "icon"
    @commonTask Menu Item Properties
  */
  itemIconKey: 'icon',

  /**
    The name of the property that contains the height for each item.

    @readOnly
    @type String
    @default "height"
    @commonTask Menu Item Properties
  */
  itemHeightKey: 'height',

  /**
    The name of the property that contains an optional submenu for each item.

    @type String
    @default "subMenu"
    @commonTask Menu Item Properties
  */
  itemSubMenuKey: 'subMenu',

  /**
    The name of the property that determines whether the item is a menu
    separator.

    @type String
    @default "isSeparator"
    @commonTask Menu Item Properties
  */
  itemSeparatorKey: 'isSeparator',

  /**
    The name of the property that contains the target for the action that is
    triggered when the user clicks the menu item.

    Note that this property is ignored if the menu item has a submenu.

    @type String
    @default "target"
    @commonTask Menu Item Properties
  */
  itemTargetKey: 'target',

  /**
    The name of the property that contains the action that is triggered when
    the user clicks the menu item.

    Note that this property is ignored if the menu item has a submenu.

    @type String
    @default "action"
    @commonTask Menu Item Properties
  */
  itemActionKey: 'action',

  /**
    The name of the property that determines whether the menu item should
    display a checkbox.

    @type String
    @default "checkbox"
    @commonTask Menu Item Properties
  */
  itemCheckboxKey: 'checkbox',

  /**
    The name of the property that contains the shortcut to be displayed.

    The shortcut should communicate the keyboard equivalent to the user.

    @type String
    @default "shortcut"
    @commonTask Menu Item Properties
  */
  itemShortCutKey: 'shortcut',

  /**
    The name of the property that contains the key equivalent of the menu
    item.

    The action of the menu item will be fired, and the menu pane's
    `selectedItem` property set to the menu item, if the user presses this
    key combination on the keyboard.

    @type String
    @default "keyEquivalent"
    @commonTask Menu Item Properties
  */
  itemKeyEquivalentKey: 'keyEquivalent',

  /**
    The name of the property that determines whether menu flash should be
    disabled.

    When you click on a menu item, it will flash several times to indicate
    selection to the user. Some browsers block windows from opening outside of
    a mouse event, so you may wish to disable menu flashing if the action of
    the menu item should open a new window.

    @type String
    @default "disableMenuFlash"
    @commonTask Menu Item Properties
  */
  itemDisableMenuFlashKey: 'disableMenuFlash',

  /**
    The name of the property that determines whether layerID should be applied to the item .

    @type String
    @default "layerId"
    @commonTask Menu Item Properties
  */
  itemLayerIdKey: 'layerId',

  /**
    The name of the property that determines whether a unique exampleView should be created for the item .

    @type String
    @default "exampleView"
    @commonTask Menu Item Properties
  */
  itemExampleViewKey: 'exampleView',

  /**
    The array of keys used by SC.MenuItemView when inspecting your menu items
    for display properties.

    @private
    @isReadOnly
    @type Array
  */
  menuItemKeys: ['itemTitleKey', 'itemValueKey', 'itemIsEnabledKey', 'itemIconKey', 'itemSeparatorKey', 'itemActionKey', 'itemCheckboxKey', 'itemShortCutKey', 'itemHeightKey', 'itemSubMenuKey', 'itemKeyEquivalentKey', 'itemTargetKey', 'itemLayerIdKey'],

  // ..........................................................
  // DEFAULT PROPERTIES
  //

  /*
    If an item doesn't specify a target, this is used. (Only used if an action is found and is not a function.)

    @type String
    @default null
  */
  target: null,

  /*
    If an item doesn't specify an action, this is used.

    @type String
    @default null
  */
  action: null,

  // ..........................................................
  // INTERNAL PROPERTIES
  //

  /** @private */
  preferType: SC.PICKER_MENU,

  /**
    Create a modal pane beneath the menu that will prevent any mouse clicks
    that fall outside the menu pane from triggering an inadvertent action.

    @type Boolean
    @private
  */
  isModal: YES,

  // ..........................................................
  // INTERNAL METHODS
  //

  /** @private */
  init: function () {
    // Initialize the items array.
    if (!this.items) { this.items = []; }

    // An associative array of the shortcut keys. The key is the shortcut in the
    // form 'ctrl_z', and the value is the menu item of the action to trigger.
    this._keyEquivalents = {};

    // Continue initializing now that default values exist.
    sc_super();
  },

  displayProperties: ['controlSize'],

  renderDelegateName: 'menuRenderDelegate',

  /**
    Creates the child scroll view, and sets its `contentView` to a new
    view.  This new view is saved and managed by the `SC.MenuPane`,
    and contains the visible menu items.

    @private
    @returns {SC.View} receiver
  */
  createChildViews: function () {
    var scroll, menuView, menuItemViews;

    scroll = this._menuScrollView = this.createChildView(SC.MenuScrollView, {
      controlSize: this.get('controlSize')
    });

    menuView = this._menuView = SC.View.create({
      parentViewDidResize: function () {
        this.notifyPropertyChange('frame');
      },

      viewDidResize: function () {

      }
    });

    menuItemViews = this.get('menuItemViews');
    menuView.replaceAllChildren(menuItemViews);

    // Adjust our menu view's layout to fit the calculated menu height.
    menuView.set('layout', { top: 0, left: 0, height : this.get('menuHeight')});

    scroll.set('contentView', menuView);

    this.childViews = [scroll];

    return this;
  },

  /**
    Called when the pane is attached.  Takes on menu pane status.

    We don't call `sc_super()` here because `PanelPane` sets the current pane to
    be the key pane when attached.
  */
  didAppendToDocument: function () {
    this.becomeMenuPane();
  },

  /**
    Called when the pane is detached.  Closes all submenus and resigns menu pane
    status.

    We don't call `sc_super()` here because `PanelPane` resigns key pane when
    detached.
  */
  willRemoveFromDocument: function () {
    var parentMenu = this.get('parentMenu');

    this.set('currentMenuItem', null);
    this.closeOpenMenus();
    this.resignMenuPane();

    if (parentMenu) {
      parentMenu.becomeMenuPane();
    }
  },

  /**
    Make the pane the menu pane. When you call this, all key events will
    temporarily be routed to this pane. Make sure that you call
    resignMenuPane; otherwise all key events will be blocked to other panes.

    @returns {SC.Pane} receiver
  */
  becomeMenuPane: function () {
    if (this.rootResponder) this.rootResponder.makeMenuPane(this);

    return this;
  },

  /**
    Remove the menu pane status from the pane.  This will simply set the
    `menuPane` on the `rootResponder` to `null.

    @returns {SC.Pane} receiver
  */
  resignMenuPane: function () {
    if (this.rootResponder) this.rootResponder.makeMenuPane(null);

    return this;
  },

  /**
    The array of child menu item views that compose the menu.

    This computed property parses `displayItems` and constructs an
    `SC.MenuItemView` (or whatever class you have set as the `exampleView`) for every item.

    This calls createMenuItemViews. If you want to override this property, override
    that method.

    @type
    @type Array
    @readOnly
  */
  menuItemViews: function () {
    return this.createMenuItemViews();
  }.property('displayItems').cacheable(),

  /**
    Processes the displayItems and creates menu item views for each item.

    Override this method to change how menuItemViews is calculated.

    @return Array
  */
  createMenuItemViews: function () {
    var views = [], items = this.get('displayItems'),
        exampleView = this.get('exampleView'), item, itemView, view,
        exampleViewKey, itemExampleView,
        height, heightKey, separatorKey, defaultHeight, separatorHeight,
        menuHeight, menuHeightPadding, keyEquivalentKey, keyEquivalent,
        keyArray, idx, layerIdKey, propertiesHash,
        len;

    if (!items) return views; // return an empty array

    heightKey = this.get('itemHeightKey');
    separatorKey = this.get('itemSeparatorKey');
    exampleViewKey = this.get('itemExampleViewKey');
    defaultHeight = this.get('itemHeight');
    keyEquivalentKey = this.get('itemKeyEquivalentKey');
    separatorHeight = this.get('itemSeparatorHeight');
    layerIdKey = this.get('itemLayerIdKey');
    menuHeightPadding = Math.floor(this.get('menuHeightPadding') / 2);
    menuHeight = menuHeightPadding;

    keyArray = this.menuItemKeys.map(SC._menu_fetchKeys, this);

    len = items.get('length');
    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      height = item.get(heightKey);
      if (!height) {
        height = item.get(separatorKey) ? separatorHeight : defaultHeight;
        //@if(debug)
        // TODO: Remove in 1.10 and 2.0
        // Help the developer if they were relying on the previously misleading
        // default value of itemSeparatorKey.  We need to ensure that the change
        // is backwards compatible with apps prior to 1.9.
        if (separatorKey === 'isSeparator' && SC.none(item.get('isSeparator')) && item.get('separator')) {
          SC.warn("Developer Warning: the default value of itemSeparatorKey has been changed from 'separator' to 'isSeparator' to match the documentation.  Please update your menu item properties to 'isSeparator: YES' to remove this warning.");
          height = separatorHeight;
          item.set('isSeparator', YES);
        }
        //@endif
      }

      propertiesHash = {
        layout: { height: height, top: menuHeight },
        contentDisplayProperties: keyArray,
        content: item,
        parentMenu: this
      };

      if (item.get(layerIdKey)) {
        propertiesHash.layerId = item.get(layerIdKey);
      }

      // Item has its own exampleView so use it
      itemExampleView = item.get(exampleViewKey);
      if (itemExampleView) {
        itemView = itemExampleView;
      } else {
        itemView = exampleView;
      }

      view = this._menuView.createChildView(itemView, propertiesHash);
      views[idx] = view;
      menuHeight += height;
      keyEquivalent = item.get(keyEquivalentKey);
      if (keyEquivalent) {
        // if array, apply each one for this view
        if (SC.typeOf(keyEquivalent) === SC.T_ARRAY) {
          keyEquivalent.forEach(function (keyEq) {
            this._keyEquivalents[keyEq] = view;
          }, this);
        } else {
          this._keyEquivalents[keyEquivalent] = view;
        }
      }
    }

    this.set('menuHeight', menuHeight + menuHeightPadding);
    return views;
  },

  /**
    Returns the menu item view for the content object at the specified index.

    @param Number idx the item index
    @returns {SC.MenuItemView} instantiated view
  */
  menuItemViewForContentIndex: function (idx) {
    var menuItemViews = this.get('menuItemViews');

    if (!menuItemViews) return undefined;
    return menuItemViews.objectAt(idx);
  },

  /**
    If this is a submenu, this property corresponds to the
    top-most parent menu. If this is the root menu, it returns
    itself.

    @type SC.MenuPane
    @isReadOnly
    @type
  */
  rootMenu: function () {
    if (this.get('isSubMenu')) return this.getPath('parentMenu.rootMenu');
    return this;
  }.property('isSubMenu').cacheable(),


  destroy: function () {
    var ret = sc_super();

    // Clean up previous enumerable observer.
    if (this._sc_menu_items) {
      this._sc_menu_items.removeObserver('[]', this, '_sc_menu_itemPropertiesDidChange');
    }

    // Destroy the menu view we created.  The scroll view's container will NOT
    // destroy this because it receives it already instantiated.
    this._menuView.destroy();

    // Clean up caches.
    this._sc_menu_items = null;
    this._menuView = null;

    return ret;
  },

  /**
    Close the menu if the user resizes the window.

    @private
  */
  windowSizeDidChange: function () {
    this.remove();
    return sc_super();
  },

  /**
    Returns an array of normalized display items.

    Because the items property can be provided as either an array of strings,
    or an object with key-value pairs, or an exotic mish-mash of both, we need
    to normalize it for our display logic.

    If an `items` member is an object, we can assume it is formatted properly
    and leave it as-is.

    If an `items` member is a string, we create a hash with the title value
    set to that string, and some sensible defaults for the other properties.

    A side effect of running this computed property is that the menuHeight
    property is updated.

    `displayItems` should never be set directly; instead, set `items` and
    `displayItems` will update automatically.

    @type
    @type Array
    @isReadOnly
  */
  displayItems: function () {
    var items = this.get('items'),
      len,
      ret = [], idx, item, itemType;

    if (!items) return null;

    len = items.get('length');

    // Loop through the items property and transmute as needed, then
    // copy the new objects into the ret array.
    for (idx = 0; idx < len; idx++) {
      item = items.objectAt(idx);

      // fast track out if we can't do anything with this item
      if (!item) continue;

      itemType = SC.typeOf(item);
      if (itemType === SC.T_STRING) {
        item = SC.Object.create({ title: item,
                                  value: item,
                                  isEnabled: YES
                               });
      } else if (itemType === SC.T_HASH) {
        item = SC.Object.create(item);
      }
      item.contentIndex = idx;

      ret.push(item);
    }

    return ret;
  }.property('items').cacheable(),

  _sc_menu_itemsDidChange: function () {
    var items = this.get('items');

    // Clean up previous enumerable observer.
    if (this._sc_menu_items) {
      this._sc_menu_items.removeObserver('[]', this, '_sc_menu_itemPropertiesDidChange');
    }

    // Add new enumerable observer
    if (items) {
      items.addObserver('[]', this, '_sc_menu_itemPropertiesDidChange');
    }

    // Cache the last items.
    this._sc_menu_items = items;

    var itemViews;
    itemViews = this.get('menuItemViews');
    this._menuView.replaceAllChildren(itemViews);
    this._menuView.adjust('height', this.get('menuHeight'));
  }.observes('items'),

  _sc_menu_itemPropertiesDidChange: function () {
    // Indicate that the displayItems changed.
    this.notifyPropertyChange('displayItems');

    var itemViews;
    itemViews = this.get('menuItemViews');
    this._menuView.replaceAllChildren(itemViews);
    this._menuView.adjust('height', this.get('menuHeight'));
  },

  currentMenuItem: function (key, value) {
    if (value !== undefined) {
      if (this._currentMenuItem !== null) {
        this.set('previousMenuItem', this._currentMenuItem);
      }
      this._currentMenuItem = value;
      this.setPath('rootMenu.targetMenuItem', value);

      return value;
    }

    return this._currentMenuItem;
  }.property().cacheable(),

  _sc_menu_currentMenuItemDidChange: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        previousMenuItem = this.get('previousMenuItem');

    if (previousMenuItem) {
      if (previousMenuItem.get('hasSubMenu') && currentMenuItem === null) {

      } else {
        previousMenuItem.resignFirstResponder();
        this.closeOpenMenusFor(previousMenuItem);
      }
    }

    // Scroll to the selected menu item if it's not visible on screen.
    // This is useful for keyboard navigation and programmatically selecting
    // the selected menu item, as in `SelectButtonView`.
    if (currentMenuItem && currentMenuItem.get('isEnabled')) {
      currentMenuItem.scrollToVisible();
    }
  }.observes('currentMenuItem'),

  closeOpenMenusFor: function (menuItem) {
    if (!menuItem) return;

    var menu = menuItem.get('parentMenu');

    // Close any open menus if a root menu changes
    while (menu && menuItem) {
      menu = menuItem.get('subMenu');
      if (menu) {
        menu.remove();
        menuItem.resignFirstResponder();
        menuItem = menu.get('previousMenuItem');
      }
    }
  },

  closeOpenMenus: function () {
    this.closeOpenMenusFor(this.get('previousMenuItem'));
  },

  //Mouse and Key Events

  /** @private */
  mouseDown: function (evt) {
    this.modalPaneDidClick(evt);
    return YES;
  },

  /** @private
    Note when the mouse has entered, so that if this is a submenu,
    the menu item to which it belongs knows whether to maintain its highlight
    or not.

    @param {Event} evt
  */
  mouseEntered: function () {
    this.set('mouseHasEntered', YES);
  },

  keyUp: function (evt) {
    var ret = this.interpretKeyEvents(evt);
    return !ret ? NO : ret;
  },

  /**
    Selects the next enabled menu item above the currently
    selected menu item when the up-arrow key is pressed.

    @private
  */
  moveUp: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        items = this.get('menuItemViews'),
        currentIndex, idx;

    if (!currentMenuItem) {
      idx = items.get('length') - 1;
    } else {
      currentIndex = currentMenuItem.getPath('content.contentIndex');
      if (currentIndex === 0) return YES;
      idx = currentIndex - 1;
    }

    while (idx >= 0) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      idx--;
    }

    return YES;
  },

  /**
    Selects the next enabled menu item below the currently
    selected menu item when the down-arrow key is pressed.

    @private
  */
  moveDown: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        items = this.get('menuItemViews'),
        len = items.get('length'),
        currentIndex, idx;

    if (!currentMenuItem) {
      idx = 0;
    } else {
      currentIndex = currentMenuItem.getPath('content.contentIndex');
      if (currentIndex === len) return YES;
      idx = currentIndex + 1;
    }

    while (idx < len) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      idx++;
    }

    return YES;
  },

  /**
    Selects the first enabled menu item when the home key is pressed.

    @private
   */
  moveToBeginningOfDocument: function () {
    var items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = 0;

    while (idx < len) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      ++idx;
    }

    return YES;
  },

  /**
    Selects the last enabled menu item when the end key is pressed.

    @private
  */
  moveToEndOfDocument: function () {
    var items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = len - 1;

    while (idx >= 0) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      --idx;
    }

    return YES;
  },

  /**
    Selects the next item one page down. If that is not enabled,
    continues to move down until it finds an enabled item.

    @private
  */
  pageDown: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        item, items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = 0,
        foundItemIdx,
        verticalOffset = 0,
        verticalPageScroll;

    if (this._menuScrollView && this._menuScrollView.verticalScrollerView2) {

      if (currentMenuItem) {
        idx = currentMenuItem.getPath('content.contentIndex');
      }

      foundItemIdx = idx;
      verticalPageScroll = this._menuScrollView.get('verticalPageScroll');
      for (idx; idx < len; idx++) {
        item = items[idx];
        verticalOffset += item.get('layout').height;

        if (verticalOffset > verticalPageScroll) {
          // We've gone further than an entire page scroll, so stop.
          break;
        } else {
          // Only accept enabled items (which also excludes separators).
          if (item.get('isEnabled')) { foundItemIdx = idx; }
        }
      }

      item = items[foundItemIdx];
      this.set('currentMenuItem', item);
      item.becomeFirstResponder();
    } else {
      this.moveToEndOfDocument();
    }

    return YES;
  },

  /**
    Selects the previous item one page up. If that is not enabled,
    continues to move up until it finds an enabled item.

    @private
  */
  pageUp: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        item, items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = len - 1,
        foundItemIdx,
        verticalOffset = 0,
        verticalPageScroll;

    if (this._menuScrollView && this._menuScrollView.verticalScrollerView) {

      if (currentMenuItem) {
        idx = currentMenuItem.getPath('content.contentIndex');
      }

      foundItemIdx = idx;
      verticalPageScroll = this._menuScrollView.get('verticalPageScroll');
      for (idx; idx >= 0; idx--) {
        item = items[idx];
        verticalOffset += item.get('layout').height;

        if (verticalOffset > verticalPageScroll) {
          // We've gone further than an entire page scroll, so stop.
          break;
        } else {
          // Only accept enabled items (which also excludes separators).
          if (item.get('isEnabled')) { foundItemIdx = idx; }
        }
      }

      item = items[foundItemIdx];
      this.set('currentMenuItem', item);
      item.becomeFirstResponder();
    } else {
      this.moveToBeginningOfDocument();
    }

    return YES;
  },

  insertText: function (chr) {
    var timer = this._timer, keyBuffer = this._keyBuffer;

    if (timer) {
      timer.invalidate();
    }
    timer = this._timer = SC.Timer.schedule({
      target: this,
      action: 'clearKeyBuffer',
      interval: 500,
      isPooled: NO
    });

    keyBuffer = keyBuffer || '';
    keyBuffer += chr.toUpperCase();

    this.selectMenuItemForString(keyBuffer);
    this._keyBuffer = keyBuffer;

    return YES;
  },

  /** @private
    Called by the view hierarchy when the menu should respond to a shortcut
    key being pressed.

    Normally, the menu will only respond to key presses when it is visible.
    However, when the menu is part of another control, such as an
    SC.PopupButtonView, the menu should still respond if it is hidden but its
    parent control is visible. In those cases, the parameter
    fromVisibleControl will be set to `YES`.

    @param keyEquivalent {String} the shortcut key sequence that was pressed
    @param fromVisibleControl Boolean if the shortcut key press was proxied
    to this menu by a visible parent control
    @returns Boolean
  */
  performKeyEquivalent: function (keyEquivalent, evt, fromVisibleControl) {
    //If menu is not visible
    if (!fromVisibleControl && !this.get('isVisibleInWindow')) return NO;

    // Look for menu item that has this key equivalent
    var menuItem = this._keyEquivalents[keyEquivalent];

    // If found, have it perform its action
    if (menuItem) {
      menuItem.performAction(YES);
      return YES;
    }

    // If escape key or the enter key was pressed and no menu item handled it,
    // close the menu pane and return YES that the event was handled
    if (keyEquivalent === 'escape' || keyEquivalent === 'return') {
      this.remove();
      return YES;
    }

    return NO;

  },

  selectMenuItemForString: function (buffer) {
    var items = this.get('menuItemViews'), item, title, idx, len, bufferLength;
    if (!items) return;

    bufferLength = buffer.length;
    len = items.get('length');
    for (idx = 0; idx < len; idx++) {
      item = items.objectAt(idx);
      title = item.get('title');

      if (!title) continue;

      title = title.replace(/ /g, '').substr(0, bufferLength).toUpperCase();
      if (title === buffer) {
        this.set('currentMenuItem', item);
        item.becomeFirstResponder();
        break;
      }
    }
  },

  /**
    Clear the key buffer if the user does not enter any text after a certain
    amount of time.

    This is called by the timer created in the `insertText` method.

    @private
  */
  clearKeyBuffer: function () {
    this._keyBuffer = '';
  },

  /**
    Close the menu and any open submenus if the user clicks outside the menu.

    Because only the root-most menu has a modal pane, this will only ever get
    called once.

    @returns Boolean
    @private
  */
  modalPaneDidClick: function () {
    this.remove();

    return YES;
  }
});

SC._menu_fetchKeys = function (k) {
  return this.get(k);
};
SC._menu_fetchItem = function (k) {
  if (!k) return null;
  return this.get ? this.get(k) : this[k];
};

// If a menu pane exceeds the height of the viewport, it will
// be truncated to fit. This value determines the amount by which
// the menu will be offset from the top and bottom of the viewport.
SC.MenuPane.VERTICAL_OFFSET = 23;
