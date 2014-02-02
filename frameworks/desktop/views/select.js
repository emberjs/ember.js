// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/button');

/**
  @class

  SelectView has a functionality similar to that of SelectField

  Clicking the SelectView button displays a menu pane with a
  list of items. The selected item will be displayed on the button.
  User has the option of enabling checkbox for the selected menu item.

  @extends SC.ButtonView
  @version 1.0
  @author Alex Iskander, Mohammed Ashik
*/
SC.SelectView = SC.ButtonView.extend(
/** @scope SC.SelectView.prototype */ {

  /**
    @field
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: function () {
    return this.get('isEnabledInPane');
  }.property('isEnabledInPane'),

  /**
    If true, titles will be escaped to avoid scripting attacks.

    @type Boolean
    @default YES
  */
  escapeHTML: YES,
  escapeHTMLBindingDefault: SC.Binding.oneWay().bool(),

  /**
    An array of items that will be form the menu you want to show.

    @type Array
    @default []
  */
  items: [],

  /** @private */
  itemsBindingDefault: SC.Binding.multiple(),

  /**
    If you set this to a non-null value, then the name shown for each
    menu item will be pulled from the object using the named property.
    if this is null, the collection items themselves will be used.

    @type String
    @default null
  */
  itemTitleKey: null,

  /**
    If you set this to a non-null value, then the value of this key will
    be used to sort the items.  If this is not set, then itemTitleKey will
    be used.

    @type String
    @default null
  */
  itemSortKey: null,

  /**
     Set this to a non-null value to use a key from the passed set of items
     as the value for the options popup.  If you don't set this, then the
     items themselves will be used as the value.

     @type String
     @default null
  */
  itemValueKey: null,

  /**
     Key used to extract icons from the items array

     @type String
     @default null
  */
  itemIconKey: null,

  /**
    Key to use to identify separators.

    @type String
    @default "isSeparator"
  */
  itemSeparatorKey: "isSeparator",

  /**
    Key used to indicate if the item is to be enabled.

    @type String
    @default "isEnabled"
  */
  itemIsEnabledKey: "isEnabled",

  /**
    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    if true, it means that no sorting will occur, items will appear
    in the same order as in the array

    @type Boolean
    @default YES
  */
  disableSort: YES,

  /**
    @type Array
    @default ['sc-select-button']
    @see SC.View#classNames
  */
  classNames: ['sc-select-view'],

  /**
    Menu attached to the SelectView.

    @type SC.View
    @default SC.MenuView
  */
  menu: null,

  /**
    List of actual menu items, handed off to the menu view.

    @property
    @private
    @type:{Array}
  */
  _itemList: [],

  /**
    Property to set the index of the selected menu item. This in turn
    is used to calculate the preferMatrix.

    @property
    @type Number
    @default null
    @private
  */
  _itemIdx: null,

  /**
     Current Value of the SelectView

     @type Object
     @default null
  */
  value: null,

  /**
    if this property is set to 'YES', a checkbox is shown next to the
    selected menu item.

    @type Boolean
    @default YES
  */
  checkboxEnabled: YES,

  /**
    if this property is set to 'YES', a checkbox is shown next to the
    selected menu item.

    @type Boolean
    @default YES
  */
  showCheckbox: YES,

  /**
    Set this to non-null to place an empty option at the top of the menu.

    @property
    @type String
    @default null
  */
  emptyName: null,

  /**
    Default value of the select button.
     This will be the first item from the menu item list.

    @private
  */
  _defaultVal: null,

  /**
    Default title of the select button.
     This will be the title corresponding to the _defaultVal.

    @private
  */
  _defaultTitle: null,

  /**
    Default icon of the select button.
     This will be the icon corresponding to the _defaultVal.

    @private
  */
  _defaultIcon: null,

  /**
    The button theme will be popup

    @type String
    @default 'popup'
    @readOnly
  */
  theme: 'popup',

  /**
    @type SC.Array
    @default ['icon', 'value','controlSize']
    @see SC.View#displayProperties
  */
  displayProperties: ['icon', 'value','controlSize', 'escapeHTML', 'emptyName'],

  /**
    Prefer matrix to position the select button menu such that the
    selected item for the menu item will appear aligned to the
    the button. The value at the second index(0) changes based on the
    position(index) of the menu item in the menu pane.

    @type Array
    @default null
  */
  preferMatrix: null,

  /**
    Property to set the menu item height. This in turn is used for
    the calculation of prefMatrix.

    @type Number
    @default 20
  */
  CUSTOM_MENU_ITEM_HEIGHT: 20,

  /**
    Binds the button's selection state to the menu's visibility.

    @private
  */
  isActiveBinding: '*menu.isVisibleInWindow',

  /**
    If this property is set to 'YES', the menu pane will be positioned
    below the anchor.

    @type Boolean
    @default NO
  */
  isDefaultPosition: NO,

  /**
    lastMenuWidth is the width of the last menu which was created from
    the items of this select button.

    @private
  */
  lastMenuWidth: null,

  /**
    Example view used for menu items.

    @type SC.View
    @default null
  */
  exampleView: null,

  /**
    customView menu offset width

    @type Number
    @default 0
  */
  customViewMenuOffsetWidth: 0,

  /**
    This is a property for enabling/disabling ellipsis

    @type Boolean
    @default YES
  */
  needsEllipsis: YES,

  /**
    This property allows you at add extra padding to the height
    of the menu pane.

    @type Number
    @default 0
  */
  menuPaneHeightPadding: 0,

  /**
    The amount of space to add to the calculated width of the menu item strings to
    determine the width of the menu pane.

    @type Number
    @default 35
  */
  menuItemPadding: 35,

  /**
    @type Boolean
    @default NO
  */
  isContextMenuEnabled: NO,

  /**
    This is a property to enable/disable focus rings in buttons.
    For select_button, we are making it a default.

    @type Boolean
    @default YES
    @see SC.ButtonView#supportFocusRing
  */
  supportFocusRing: YES,

  /**
  * @private
  * Overwritten to calculate the content corresponding to items configured at creation
  */
  init: function() {
    sc_super();

    this.itemsDidChange();
  },

  /**
    Left Alignment based on the size of the button

    @private
  */
  leftAlign: function () {
    switch (this.get('controlSize')) {
      case SC.TINY_CONTROL_SIZE:
        return SC.SelectView.TINY_OFFSET_X;
      case SC.SMALL_CONTROL_SIZE:
        return SC.SelectView.SMALL_OFFSET_X;
      case SC.REGULAR_CONTROL_SIZE:
        return SC.SelectView.REGULAR_OFFSET_X;
      case SC.LARGE_CONTROL_SIZE:
        return SC.SelectView.LARGE_OFFSET_X;
      case SC.HUGE_CONTROL_SIZE:
        return SC.SelectView.HUGE_OFFSET_X;
    }
    return 0;
  }.property('controlSize'),

  /**
    override this method to implement your own sorting of the menu. By
    default, menu items are sorted using the value shown or the sortKey

    @param {SC.Array} objects the unsorted array of objects to display.
    @returns {SC.Array} sorted array of objects
  */
  sortObjects: function (objects) {
    if (!this.get('disableSort')){
      var nameKey = this.get('itemSortKey') || this.get('itemTitleKey');
      objects = objects.sort(function (a,b) {
        if (nameKey) {
          a = a.get ? a.get(nameKey) : a[nameKey];
          b = b.get ? b.get(nameKey) : b[nameKey];
        }
        return (a<b) ? -1 : ((a>b) ? 1 : 0);
      });
    }
    return objects;
  },

  /**
    Observer called whenever the items collection or an element of this collection changes

    @private
  */
  itemsDidChange: function() {
    var escapeHTML, items, len, nameKey, iconKey, valueKey, separatorKey, showCheckbox,
      currentSelectedVal, shouldLocalize, isSeparator, itemList, isChecked,
      idx, name, icon, value, item, itemEnabled, isEnabledKey, emptyName, isSameRecord;

    items = this.get('items') || [];
    items = this.sortObjects(items);
    len = items.length;

    //Get the nameKey, iconKey and valueKey set by the user
    nameKey = this.get('itemTitleKey');
    iconKey = this.get('itemIconKey');
    valueKey = this.get('itemValueKey');
    separatorKey = this.get('itemSeparatorKey');
    showCheckbox = this.get('showCheckbox');
    isEnabledKey = this.get('itemIsEnabledKey');
    escapeHTML = this.get('escapeHTML');

    //get the current selected value
    currentSelectedVal = this.get('value');

    // get the localization flag.
    shouldLocalize = this.get('localize');

    //itemList array to set the menu items
    itemList = [];

    //to set the 'checkbox' property of menu items
    isChecked = YES;

    //index for finding the first item in the list
    idx = 0;

    // Add the empty name to the list if applicable
    emptyName = this.get('emptyName');

    if (!SC.none(emptyName)) {
      emptyName = shouldLocalize ? SC.String.loc(emptyName) : emptyName;
      emptyName = escapeHTML ? SC.RenderContext.escapeHTML(emptyName) : emptyName;

      item = SC.Object.create({
        isSeparator: NO,
        title: emptyName,
        icon: null,
        value: null,
        isEnabled: YES,
        checkbox: NO,
        target: this,
        action: 'displaySelectedItem'
      });

      if (SC.none(currentSelectedVal)) {
        this.set('title', emptyName);
      }

      //Set the items in the itemList array
      itemList.push(item);
    }

    items.forEach(function (object) {
      if (object || object === 0) {
        //@if (debug)
        // TODO: Remove in 1.11 and 2.0
        // Help the developer if they were relying on the previously misleading
        // default value of itemSeparatorKey.  We need to ensure that the change
        // is backwards compatible with apps prior to 1.10.
        if (separatorKey === 'isSeparator') {
          if ((object.get && SC.none(object.get('isSeparator')) && object.get('separator')) || (SC.none(object.isSeparator) && object.separator)) {
            SC.warn("Developer Warning: the default value of itemSeparatorKey has been changed from 'separator' to 'isSeparator' to match the documentation.  Please update your select item properties to 'isSeparator: YES' to remove this warning.");
            if (object.set) { object.set('isSeparator', object.get('separator')); }
            else { object.isSeparator = object.separator; }
          }
        }
        //@endif

        // get the separator
        isSeparator = separatorKey ? (object.get ? object.get(separatorKey) : object[separatorKey]) : NO;

        if (isSeparator) {
          item = SC.Object.create({
            isSeparator: true,
            value: '_sc_separator_item'
          });
        } else {
          //Get the name value. If value key is not specified convert obj
          //to string
          name = nameKey ? (object.get ?
            object.get(nameKey) : object[nameKey]) : object.toString();

          //@if (debug)
          // Help the developer if they don't define a matching itemTitleKey.
          if (!name) {
            SC.warn("Developer Warning: SC.SelectView: Every item, other than separator items, should have the '%@' property defined!".fmt(nameKey));
            name = '';
          }
          //@endif
          // localize name if specified.
          name = shouldLocalize ? SC.String.loc(name) : name;
          name = escapeHTML ? SC.RenderContext.escapeHTML(name) : name;

          //Get the icon value
          icon = iconKey ? (object.get ?
            object.get(iconKey) : object[iconKey]) : null;
          if (SC.none(object[iconKey])) icon = null;

          // get the value using the valueKey or the object
          value = valueKey ? (object.get ?
            object.get(valueKey) : object[valueKey]) : object;

          if (!SC.none(currentSelectedVal) && !SC.none(value)) {

            // If the objects in question are records, we should just their storeKeys
            isSameRecord = false;
            if (SC.kindOf(currentSelectedVal, SC.Record) && SC.kindOf(value, SC.Record)) {
              isSameRecord = currentSelectedVal.get('storeKey') === value.get('storeKey');
            }

            if (currentSelectedVal === value || isSameRecord) {
              this.set('title', name);
              this.set('icon', icon);
            }
          }

          //Check if the item is currentSelectedItem or not
          if (value === this.get('value')) {

            //set the _itemIdx - To change the prefMatrix accordingly.
            this.set('_itemIdx', idx);
            isChecked = !showCheckbox ? NO : YES;
          } else {
            isChecked = NO;
          }

          // Check if the item is enabled
          itemEnabled = (object.get ? object.get(isEnabledKey) : object[isEnabledKey]);
          if (NO !== itemEnabled) itemEnabled = YES;

          // Set the first non-separator selectable item from the list as the
          // default selected item
          if (SC.none(this._defaultVal) && itemEnabled) {
            this._defaultVal = value;
            this._defaultTitle = name;
            this._defaultIcon = icon;
          }

          item = SC.Object.create({
            action: 'displaySelectedItem',
            title: name,
            icon: icon,
            value: value,
            isEnabled: itemEnabled,
            checkbox: isChecked,
            target: this
          });
        }

        //Set the items in the itemList array
        itemList.push(item);

      }

      idx += 1;

      this.set('_itemList', itemList);
    }, this );

    var value = this.get('value');
    if (SC.none(value)) {
      if (SC.none(emptyName)) {
        this.set('value', this._defaultVal);
        this.set('title', this._defaultTitle);
        this.set('icon', this._defaultIcon);
      }
      else this.set('title', emptyName);
    }

    //Set the preference matrix for the menu pane
    this.changeSelectPreferMatrix();
  }.observes( '*items.[]' ),

  /**
    @private
    @param {DOMMouseEvent} evt mouseup event that triggered the action
  */
  _action: function (evt) {
    var buttonLabel, menuWidth, scrollWidth, lastMenuWidth, offsetWidth,
      items, elementOffsetWidth, largestMenuWidth, item, idx,
      value, itemList, menuControlSize, menuHeightPadding, customView,
      menu, itemsLength, itemIdx, escapeHTML;

    buttonLabel = this.$('.sc-button-label')[0];

    var menuWidthOffset = SC.SelectView.MENU_WIDTH_OFFSET;
    if (!this.get('isDefaultPosition')) {
      switch (this.get('controlSize')) {
        case SC.TINY_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.TINY_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.SMALL_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.SMALL_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.REGULAR_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.REGULAR_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.LARGE_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.LARGE_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.HUGE_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.HUGE_POPUP_MENU_WIDTH_OFFSET;
          break;
      }
    }
    // Get the length of the text on the button in pixels
    menuWidth = this.get('layer').offsetWidth + menuWidthOffset;

    // Get the length of the text on the button in pixels
    menuWidth = this.get('layer').offsetWidth;
    scrollWidth = buttonLabel.scrollWidth;
    lastMenuWidth = this.get('lastMenuWidth');
    if (scrollWidth) {
       // Get the original width of the label in the button
       offsetWidth = buttonLabel.offsetWidth;
       if (scrollWidth && offsetWidth) {
          menuWidth = menuWidth + scrollWidth - offsetWidth;
       }
    }
    if (!lastMenuWidth || (menuWidth > lastMenuWidth)) {
      lastMenuWidth = menuWidth;
    }

    items = this.get('_itemList');

    var customViewClassName = this.get('customViewClassName');
    // var customViewMenuOffsetWidth = this.get('customViewMenuOffsetWidth');
    var className = 'sc-view sc-pane sc-panel sc-palette sc-picker sc-menu select-button sc-scroll-view sc-menu-scroll-view sc-container-view menuContainer sc-button-view sc-menu-item sc-regular-size';
    className = customViewClassName ? (className + ' ' + customViewClassName) : className;

    SC.prepareStringMeasurement("", className);
    for (idx = 0, itemsLength = items.length; idx < itemsLength; ++idx) {
      //getting the width of largest menu item
      item = items.objectAt(idx);
      elementOffsetWidth = SC.measureString(item.title).width;

      if (!largestMenuWidth || (elementOffsetWidth > largestMenuWidth)) {
        largestMenuWidth = elementOffsetWidth;
      }
    }
    SC.teardownStringMeasurement();

    lastMenuWidth = (largestMenuWidth + this.menuItemPadding > lastMenuWidth) ?
                      largestMenuWidth + this.menuItemPadding : lastMenuWidth;

    // Get the window size width and compare with the lastMenuWidth.
    // If it is greater than windows width then reduce the maxwidth by 25px
    // so that the ellipsis property is enabled by default
    var maxWidth = SC.RootResponder.responder.get('currentWindowSize').width;
    if (lastMenuWidth > maxWidth) {
      lastMenuWidth = (maxWidth - 25);
    }

    this.set('lastMenuWidth',lastMenuWidth);
    value = this.get('value');
    itemList = this.get('_itemList');
    menuControlSize = this.get('controlSize');
    menuHeightPadding = this.get('menuPaneHeightPadding');
    escapeHTML = this.get('escapeHTML');

    // get the user defined custom view
    customView = this.get('exampleView') || SC.MenuItemView.extend({ escapeHTML: escapeHTML });

    menu  = SC.MenuPane.create({

      /**
        Class name - select-button-item
      */
      classNames: ['select-button'],

      /**
        The menu items are set from the itemList property of SelectView

        @property
      */
      items: itemList,

      /**
        Example view which will be used to create the Menu Items

        @default SC.MenuItemView
        @type SC.View
      */
      exampleView: customView,

      /**
        This property enables all the items and makes them selectable.

        @property
      */
      isEnabled: YES,

      menuHeightPadding: menuHeightPadding,

      preferType: SC.PICKER_MENU,
      itemHeightKey: 'height',
      layout: { width: lastMenuWidth },
      controlSize: menuControlSize,
      itemWidth: lastMenuWidth
    });

    // no menu to toggle... bail...
    if (!menu) return NO;
    menu.popup(this, this.preferMatrix);
    this.set('menu', menu);

    itemIdx = this._itemIdx;
    if (!SC.empty(itemIdx) && itemIdx > -1) {
    // if there is an item selected, make it the first responder
      customView = menu.menuItemViewForContentIndex(itemIdx);
      if (customView) { customView.becomeFirstResponder(); }
    }

    this.set('isActive', YES);
    return YES;
  },

  /** @private
     Action method for the select button menu items
  */
  displaySelectedItem: function (menuView) {
    var currentItem = menuView.get("selectedItem");

    this.set("value", currentItem.get("value"));
  },

  /** @private Each time the value changes, update each item's checkbox property and update our display properties. */
  valueDidChange: function () {
    var itemList = this._itemList,
      showCheckbox = this.get('showCheckbox'),
      value = this.get('value');

    // Find the newly selected item (if any).
    for (var i = 0, len = itemList.length; i < len; i++) {
      var item = itemList[i],
        isChecked = false;

      if (value === item.get('value')) {
        isChecked = showCheckbox;
        this.set("title", item.get("title"));
        this.set("icon", item.get("icon"));
        this.set("_itemIdx", item.get("contentIndex"));
      }

      item.set('checkbox', isChecked);
    }

  }.observes('value'),

  /** @private
     Set the "top" attribute in the prefer matrix property which will
     position menu such that the selected item in the menu will be
     place aligned to the item on the button when menu is opened.
  */
  changeSelectPreferMatrix: function () {
    var controlSizeTuning = 0, customMenuItemHeight = 0;
    switch (this.get('controlSize')) {
      case SC.TINY_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.TINY_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.TINY_MENU_ITEM_HEIGHT;
        break;
      case SC.SMALL_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.SMALL_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.SMALL_MENU_ITEM_HEIGHT;
        break;
      case SC.REGULAR_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.REGULAR_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.REGULAR_MENU_ITEM_HEIGHT;
        break;
      case SC.LARGE_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.LARGE_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.LARGE_MENU_ITEM_HEIGHT;
        break;
      case SC.HUGE_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.HUGE_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.HUGE_MENU_ITEM_HEIGHT;
        break;
    }

    var preferMatrixAttributeTop = controlSizeTuning,
      itemIdx = this.get('_itemIdx'),
      leftAlign = this.get('leftAlign'), defPreferMatrix, tempPreferMatrix;

    if (this.get('isDefaultPosition')) {
      defPreferMatrix = [1, 0, 3];
      this.set('preferMatrix', defPreferMatrix);
    } else {
      if (itemIdx) {
        preferMatrixAttributeTop = itemIdx * customMenuItemHeight +
          controlSizeTuning;
      }
      tempPreferMatrix = [leftAlign, -preferMatrixAttributeTop, 2];
      this.set('preferMatrix', tempPreferMatrix);
    }
  },

  /**
    @private
    Holding down the button should display the menu pane.
  */
  mouseDown: function (evt) {
    if (!this.get('isEnabledInPane')) return YES; // handled event, but do nothing
    this.set('isActive', YES);
    this._isMouseDown = YES;
    this.becomeFirstResponder();
    this._action();
    return YES;
  },

  /** @private
    Because we responded YES to the mouseDown event, we have responsibility
    for handling the corresponding mouseUp event.

    However, the user may click on this button, then drag the mouse down to a
    menu item, and release the mouse over the menu item. We therefore need to
    delegate any mouseUp events to the menu's menu item, if one is selected.

    We also need to differentiate between a single click and a click and hold.
    If the user clicks and holds, we want to close the menu when they release.
    Otherwise, we should wait until they click on the menu's modal pane before
    removing our active state.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseUp: function (evt) {
    var menu = this.get('menu'), targetMenuItem;

    if (menu) {
      targetMenuItem = menu.getPath('rootMenu.targetMenuItem');

      if (targetMenuItem && menu.get('mouseHasEntered')) {
        // Have the menu item perform its action.
        // If the menu returns NO, it had no action to
        // perform, so we should close the menu immediately.
        if (!targetMenuItem.performAction()) menu.remove();
      } else {
        // If the user waits more than 200ms between mouseDown and mouseUp,
        // we can assume that they are clicking and dragging to the menu item,
        // and we should close the menu if they mouseup anywhere not inside
        // the menu.
        if (evt.timeStamp - this._mouseDownTimestamp > 400) {
          menu.remove();
        }
      }
    }

    // Reset state.
    this._isMouseDown = NO;
    this.set("isActive", NO);
    return YES;
  },

  /** @private
    Override mouseExited to not remove the active state on mouseexit.
  */
  mouseExited: function () {
    return YES;
  },

  /**
    @private
    Handle Key event - Down arrow key
  */
  keyDown: function (event) {
    if ( this.interpretKeyEvents(event) ) {
      return YES;
    }
    else {
      return sc_super();
    }
  },

  /**
    @private
    Pressing the Up or Down arrow key should display the menu pane. Pressing escape should
    resign first responder.
  */
  moveUp: function(evt) {
    this._action();
    return YES;
  },
  /** @private */
  moveDown: function(evt) {
    this._action();
    return YES;
  },
  cancel: function(evt) {
    this.resignFirstResponder();
  },

  /** @private
    Override the button isSelectedDidChange function in order to not perform any action
    on selecting the select_button
  */
  _button_isSelectedDidChange: function () {

  }.observes('isSelected')

});

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.TINY_OFFSET_X = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.TINY_OFFSET_Y = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.TINY_POPUP_MENU_WIDTH_OFFSET = 0;


/**
  @static
  @type Number
  @default -18
*/
SC.SelectView.SMALL_OFFSET_X = -18;

/**
  @static
  @type Number
  @default 3
*/
SC.SelectView.SMALL_OFFSET_Y = 3;

/**
  @static
  @type Number
  @default 7
*/
SC.SelectView.SMALL_POPUP_MENU_WIDTH_OFFSET = 7;


/**
  @static
  @type Number
  @default -17
*/
SC.SelectView.REGULAR_OFFSET_X = -17;

/**
  @static
  @type Number
  @default 1
*/
SC.SelectView.REGULAR_OFFSET_Y = 0;

/**
  @static
  @type Number
  @default 4
*/
SC.SelectView.REGULAR_POPUP_MENU_WIDTH_OFFSET = 4;


/**
  @static
  @type Number
  @default -17
*/
SC.SelectView.LARGE_OFFSET_X = -17;

/**
  @static
  @type Number
  @default 6
*/
SC.SelectView.LARGE_OFFSET_Y = 6;

/**
  @static
  @type Number
  @default 3
*/
SC.SelectView.LARGE_POPUP_MENU_WIDTH_OFFSET = 3;


/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.HUGE_OFFSET_X = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.HUGE_OFFSET_Y = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.HUGE_POPUP_MENU_WIDTH_OFFSET = 0;


/**
  @static
  @type Number
  @default -2
*/
SC.SelectView.MENU_WIDTH_OFFSET = -2;
