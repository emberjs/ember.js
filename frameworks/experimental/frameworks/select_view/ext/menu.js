// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('ext/menu_item');

/**
  @class
  Extends SC.MenuPane to add support for automatic resizing.
*/

SC.AutoResizingMenuPane = SC.MenuPane.extend(
/** @scope SC.AutoResizingMenuPane.prototype */ {

  /**
    If YES, the menu should automatically resize its width to fit its items.

    This will swap out the default SC.MenuItemView. If you are using a custom
    exampleView, you will need to mix SC.AutoResize into your exampleView
    and set shouldAutoResize to NO (the actual resizing will be handled
    by SC.MenuPane).

    This property must be set before instantiation; any changes after instantiation
    will not function properly.

    @property
    @type {Boolean}
    @default YES
  */
  shouldAutoResize: YES,

  /**
    The minimum width for this menu if it is to be automatically resized.

    If no value is specified, it will be determined from the controlSize.

    @type Number
    @default minimumMenuWidth from render delegate, or 0.
  */
  minimumMenuWidth: SC.propertyFromRenderDelegate('minimumMenuWidth', 0),

  /**
    The amount to add to any calculated width.

    If no value is specified, it will be determined from the controlSize.

    @type Number
    @default menuWidthPadding from render delegate, or 0
  */
  menuWidthPadding: SC.propertyFromRenderDelegate('menuWidthPadding', 0),

  /**
    @private
    In addition to the normal init, we need to schedule an automatic resize.
  */
  init: function() {
    sc_super();

    this.set('exampleView', SC.AutoResizingMenuItemView);

    if (this.get('shouldAutoResize')) {
      this.invokeOnce('_updateMenuWidth');
    }
  },

  /**
    The array of child menu item views that compose the menu.

    This computed property parses @displayItems@ and constructs an SC.MenuItemView (or whatever class you have set as the @exampleView@) for every item.

    @property
    @type Array
    @readOnly
    @private
  */
  createMenuItemViews: function() {
    // EXTENDED to set shouldMeasureSize to its initial value and to
    // observe the measured size.
    var views = sc_super();

    var idx, len = views.length, view;
    if (this.get('shouldAutoResize')) {
      for (idx = 0; idx < len; idx++) {
        view = views[idx];

        // set up resizing if we want
        view.set('shouldMeasureSize', YES);
        view.addObserver('measuredSize', this, this._menuItemMeasuredSizeDidChange);
      }
    }

    return views;
  },

  _menuItemViewsDidChange: function() {
    if (this.get('shouldAutoResize')) this.invokeOnce('_updateMenuWidth');
  }.observes('menuItemViews'),

  _menuItemMeasuredSizeDidChange: function(menuItem) {
    this.invokeOnce('_updateMenuWidth');
  },

  _menuMinimumMenuWidthDidChange: function() {
    this.invokeOnce('_updateMenuWidth');
  }.observes('minimumMenuWidth'),

  _updateMenuWidth: function() {
    var menuItemViews = this.get('menuItemViews');
    if (!menuItemViews) return;

    var len = menuItemViews.length, idx, view,
        width = this.get('minimumMenuWidth');

    for (idx = 0; idx < len; idx++) {
      view = menuItemViews[idx];
      width = Math.max(width, view.get('measuredSize').width + this.get('menuWidthPadding'));
    }

    this.adjust('width', width);
    this.positionPane();
  }
});
