// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/popup_button');
sc_require('mixins/select_view_menu');
sc_require('ext/menu');

/**
 * @class
 * @extends SC.PopupButtonView
 * @version 2.0
 * @author Alex Iskander
 */
SC.SelectView = SC.PopupButtonView.extend({
  /** @scope SC.SelectView.prototype */

  //
  // Properties
  //
  theme: 'popup',
  renderDelegateName: 'selectRenderDelegate',

  /**
    The array of items to populate the menu. This can be a simple array of strings,
    objects or hashes. If you pass objects or hashes, you can also set the
    various itemKey properties to tell the menu how to extract the information
    it needs.

    @type Array
    @default []
  */
  items: null,

  /**
    Binding default for an array of items

    @property
    @default SC.Binding.multiple()
  */
  itemsBindingDefault: SC.Binding.multiple(),

  /**
    They key in the items which maps to the title.
    This only applies for items that are hashes or SC.Objects.

    @property
    @type {String}
    @default 'title'
  */
  itemTitleKey: 'title',

  /**
    If you set this to a non-null value, then the value of this key will
    be used to sort the items.  If this is not set, then itemTitleKey will
    be used.

    @property
    @type: {String}
    @default null
  */
  itemSortKey: null,

  /**
    They key in the items which maps to the value.
    This only applies for items that are hashes or SC.Objects.

     @property
     @type {String}
     @default 'value'
  */
  itemValueKey: 'value',

  /**
     Key used to extract icons from the items array.

     @property
     @type {String}
     @default null
  */
  itemIconKey: null,

  /**
    Key to use to identify separators.

    Items that have this property set to YES will be drawn as separators.

    @property
    @type {String}
    @default null
  */
  itemSeparatorKey: "separator",

  /**
    Key used to indicate if the item is to be enabled.

    @property
    @type {String}
    @default null
  */
  itemIsEnabledKey: "isEnabled",


  /**
   The menu that will pop up when this button is clicked.

   The default menu has its properties bound to the SC.SelectView,
   meaning that it will get all its items from the SelectView.
   You may override the menu entirely with one of your own; if you
   mix in SC.SelectViewMenu, it'll get the bindings and the extended
   MenuItemView that draws its checkbox when it is the selected item.

   @property
   @type {SC.MenuPane}
   @default SC.AutoResizingMenuPane.extend(SC.SelectViewMenu)
  */
  menu: SC.AutoResizingMenuPane.extend(SC.SelectViewMenu),

  /**
    The currently selected item. If no item is selected, `null`.

    @private
    @type SC.Object
    @default null
    @isReadOnly
   */
  selectedItem: null,
  selectedItemBinding: '*menu.rootMenu.selectedItem',


  /**
    This is a property to enable/disable focus rings in buttons.
    For SelectView, it is a default.

    @property
    @type {Boolean}
    @default YES
  */
  supportsFocusRing: YES,


  /**
    * @private
  */
  init: function() {
    sc_super();

    // call valueDidChange to get the initial item, if any
    this._scsv_valueDidChange();
  },

  /**
    @private

    This gets the value for a specific menu item. This function allows a few different
    forms of input:

    - A string: returns the string.
    - A hash: returns hash[itemValueKey], using 'value' for the key if necessary.
    - An SC.Object: returns object.get(itemValueKey), using 'value' for the key if needed.

    This method therefore accepts both the menu items as created for the menupane's displayItems
    AND the raw items provided by the developer in `items`.
  */
  _scsv_getValueForMenuItem: function(item) {
    var valueKey = this.get('itemValueKey') || 'value';

    if (SC.typeOf(item) === SC.T_STRING) {
      return item;
    } else if (item.get) {
      return item.get(valueKey);
    } else {
      return item[valueKey];
    }
  },

  /**
    * When the selected item changes, we need to update our value.
    * @private
  */
  _scsv_selectedItemDidChange: function() {
    var sel = this.get('selectedItem'),
        last = this._scsv_lastSelection,
        titleKey = this.get('itemTitleKey') || 'title',
        valueKey = this.get('itemValueKey') || 'value';

    // selected item could be a menu item from SC.MenuPane's displayItems, or it could
    // be a raw item. So, we have to use _scsv_getValueForMenuItem to resolve it.
    if(sel) {
      this.setIfChanged('value', this._scsv_getValueForMenuItem(sel));
    }

    // add/remove observers for the title and value so we can invalidate.
    if (last && last.addObserver && sel !== last) {
      last.removeObserver(titleKey, this, this._scsv_selectedItemPropertyDidChange);
      last.removeObserver(valueKey, this, this._scsv_selectedItemPropertyDidChange);
    }

    if (sel && sel.addObserver && sel !== last) {
      sel.addObserver(titleKey, this, this._scsv_selectedItemPropertyDidChange);
      sel.addObserver(valueKey, this, this._scsv_selectedItemPropertyDidChange);
    }

    this._scsv_lastSelection = sel;
  }.observes('selectedItem'),

  // called when either title or value changes on the selected item
  _scsv_selectedItemPropertyDidChange: function(item) {
    this.notifyPropertyChange('title');
    this.set('value', item.get(this.get('itemValueKey') || 'value'));
  },

  /**
    The title to show when no item is selected.

    @property
    @type String
    @default ""
  */
  defaultTitle: "",

  /**
    The title of the button, derived from the selected item.
  */
  title: function() {
    var sel = this.get('selectedItem');

    if (!sel) {
      return this.get('defaultTitle');
    } else if (sel.get) {
      return sel.get(this.get('itemTitleKey') || 'title');
    } else if (SC.typeOf(sel) == SC.T_HASH) {
      return sel[this.get('itemTitleKey') || 'title'];
    } else {
      return sel;
    }
  }.property('selectedItem').cacheable(),

  /**
    * When the value changes, we need to update selectedItem.
    * @private
  */
  _scsv_valueDidChange: function() {
    var value = this.get('value');

    if (!this.get('items')) {
      return;
    }

    var items = this.get('items'), len = items.length, idx;
    for (idx = 0; idx < len; idx++) {
      if (this._scsv_getValueForMenuItem(items[idx]) === value) {
        this.setIfChanged('selectedItem', items[idx]);
        return;
      }
    }

    // if we got here, this means no item is selected
    this.setIfChanged('selectedItem', null);
  }.observes('value'),

  /**
    SelectView must set the selectView property on the menu so that the menu's
    properties get bound to the SelectView's. The bindings get set up by
    the SelectViewMenu mixin, which should be mixed in to any SelectView menu.

    In addition, the initial selected item and the initial minimum menu width are set.
    @private
  */
  createMenu: function(klass) {
    var attrs = {
      selectView: this,
      selectedItem: this.get('selectedItem'),
      minimumMenuWidth: this.get('minimumMenuWidth')
    };

    return klass.create(attrs);
  },

  /**
    The amount by which to offset the menu's left position when displaying it.
    This can be used to make sure the selected menu item is directly on top of
    the label in the SelectView.

    By default, this comes from the render delegate's menuLeftOffset property.
    If you are writing a theme, you should set the value there.

    @property
    @type Number
    @default 'menuLeftOffset' from render delegate if present, or 0.
  */
  menuLeftOffset: SC.propertyFromRenderDelegate('menuLeftOffset', 0),

  /**
    The amount by which to offset the menu's top position when displaying it.
    This is added to any amount calculated based on the 'top' of a menu item.

    This can be used to make sure the selected menu item's label is directly on
    top of the SelectView's label.

    By default, this comes from the render delegate's menuTopOffset property.
    If you are writing a theme, you should set the value there.

    @property
    @type Number
    @default 'menuTopOffset' from render delegate if present, or 0.
  */
  menuTopOffset: SC.propertyFromRenderDelegate('menuTopOffset', 0),

  /**
    An amount to add to the menu's minimum width. For instance, this could be
    set to a negative value to let arrows on the side of the SelectView be visible.

    By default, this comes from the render delegate's menuMinimumWidthOffset property.
    If you are writing a theme, you should set the value there.

    @property
    @type Number
    @default 'menuWidthOffset' from render delegate if present, or 0.
  */
  menuMinimumWidthOffset: SC.propertyFromRenderDelegate('menuMinimumWidthOffset', 0),

  /**
    The prefer matrix for menu positioning. It is calculated so that the selected
    menu item is positioned directly over the SelectView.

    @property
    @type Array
    @private
  */
  menuPreferMatrix: function() {
    var menu = this.get('menu'),
        leftPosition = this.get('menuLeftOffset'),
        topPosition = this.get('menuTopOffset');

    if (!menu) {
      return [leftPosition, topPosition, 2];
    }

    var idx = this.get('_selectedItemIndex'), itemViews = menu.get('menuItemViews');
    if (idx > -1) {
      var layout = itemViews[idx].get('layout');
      return [leftPosition, topPosition - layout.top + (layout.height/2), 2];
    }

    return [leftPosition, topPosition, 2];

  }.property('value', 'menu').cacheable(),

  /**
    Used to calculate things like the menu's top position.

    @private
  */
  _selectedItemIndex: function() {
    var menu = this.get('menu');
    if (!menu) {
      return -1;
    }

    // We have to find the selected item, and then get its 'top' position so we
    // can position the menu correctly.
    var itemViews = menu.get('menuItemViews'), idx, len = itemViews.length, view;
    for (idx = 0; idx < len; idx++) {
      view = itemViews[idx];

      // we have to compare via value
      var value = view.get('content').get(this.get('itemValueKey'));
      if (value === this.get('value')) {
        break;
      }
    }

    if (idx < len) {
      return idx;
    }

    return -1;
  }.property('value', 'menu').cacheable(),

  /**
    The minimum width for the child menu. For instance, this property can make the
    menu always cover the entire SelectView--or, alternatively, cover all but the
    arrows on the side.

    By default, it is calculated by adding the menuMinimumWidthOffset to the view's
    width. If you are writing a theme and want to change the width so the menu covers
    a specific part of the select view, change your render delegate's menuMinimumWidthOffset
    property.

    @type Number
    @property
  */
  minimumMenuWidth: function() {
    return this.get('frame').width + this.get('menuMinimumWidthOffset');
  }.property('frame', 'menuMinimumWidthOffset').cacheable(),

  //
  // KEY HANDLING
  //
  /**
    @private

    Handle Key event - Down arrow key
  */
  keyDown: function(event) {
    if ( this.interpretKeyEvents(event) ) {
      return YES;
    }
    else {
      sc_super();
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
   Function overridden - tied to the isEnabled state
  */
  acceptsFirstResponder: function() {
    return this.get('isEnabled');
  }.property('isEnabled').cacheable()

});
