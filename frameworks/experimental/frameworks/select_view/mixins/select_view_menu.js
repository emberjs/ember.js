// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
 * Binds a menu view to an owning SC.SelectView, and checks selected items.
 *
 * @mixin
 *
 */
SC.SelectViewMenu = {
  /**
    The SelectView to bind to.
    
    @property
    @type {SC.SelectView}
    @default null
  */
  selectView: null,

  //
  // CODE TO MAKE ITEMS BE CHECKED WHEN SELECTED:
  //
  
  /**
    The current value of the SelectView.
    
    @property
    @default null
  */
  value: null,
  valueBinding: '.selectView.value',


  /** 
    @private 
    Invalidates menu items' isChecked property when the selectView's value changes.
  */
  valueDidChange: function() {
    var items = this.get('menuItemViews'), idx, len = items.length, item;
    for (idx = 0; idx < len; idx++) {
      // if the item currently is checked, or if it _should_ be checked, we need to
      // invalidate the isChecked property.
      item = items[idx];
      if (item._lastIsChecked) {
        item.notifyPropertyChange('isChecked');
      }

      if (item.get('isChecked')) {
        item.notifyPropertyChange('isChecked');
      }
    }
  }.observes('value'),

  /**
    An overridden MenuItemView to create for each menu item that makes itself checked if
    it is selected.
    
    @property
    @type {SC.MenuItemView}
    @default SC.MenuItemView subclass
  */
  exampleView: SC.MenuItemView.extend({
    isChecked: function() {
      // _lastIsChecked is used by the SelectViewMenu mixin above to determine whether
      // the isChecked property needs to be invalidated.
      this._lastIsChecked = this.getContentProperty('itemValueKey') === this.getPath('parentMenu.rootMenu.value');
      return this._lastIsChecked;
    }.property(),

    displayProperties: ['isChecked']
  }),

  //
  // CODE TO BIND TO SELECTVIEW PROPERTIES
  //
  
  /** @private */
  _svm_bindToProperties: [
    'items',
    'itemTitleKey', 'itemIsEnabledKey', 'itemValueKey', 'itemIconKey', 
    'itemHeightKey', 'itemSubMenuKey', 'itemSeparatorKey', 'itemTargetKey',
    'itemActionKey', 'itemCheckboxKey', 'itemShortCutKey',
    'itemKeyEquivalentKey', 'itemDisableMenuFlashKey', 'minimumMenuWidth',
    
    'preferType', 'preferMatrix'
  ],

  /** @private */
  _svm_setupBindings: function() {
    var bindTo = this.get('selectView');
    if (!bindTo) {
      return;
    }

    var props = this._svm_bindToProperties, idx, len = props.length, key;

    for (idx = 0; idx < len; idx++) {
      key = props[idx];
      this[key + 'Binding'] = this.bind(key, bindTo, key);
    }

    this._svm_isBoundTo = bindTo;
  },

  /** @private */
  _svm_clearBindings: function() {
    var boundTo = this._svm_isBoundTo;
    if (!boundTo) {
      return;
    }

    var props = this._svm_bindToProperties, idx, len = props.length, key;

    for (idx = 0; idx < len; idx++) {
      key = props[idx];
      this[key + 'Binding'].disconnect();
    }
  },

  /** @private */
  _svm_selectViewDidChange: function() {
    this._svm_clearBindings();
    this._svm_setupBindings();
  }.observes('selectView'),

  /** @private */
  initMixin: function() {
    this._svm_setupBindings();
  },

  /** @private */
  destroyMixin: function() {
    this._svm_clearBindings();
  }
};


