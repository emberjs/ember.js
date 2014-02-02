// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  Extends SC.MenuItemView to support auto resize.
*/

SC.AutoResizingMenuItemView = SC.MenuItemView.extend(SC.AutoResize,
/** @scope SC.AutoResizingMenuItemView.prototype */ {

  //
  // For automatic resizing, if enabled (to be enabled by parent menu)
  //
  /**
    The item view is capable of automatic resizing.
    
    @private
    @property
    @type {Boolean}
  */
  supportsAutoResize: YES,

  /**
    The menu item should NOT change its own width and height.
    
    @private
    @property
    @type {Boolean}
  */
  shouldAutoResize: NO,
  
  /**
    If YES, the menu item will measure its width and height so that the menu
    can automatically resize itself. This is usually set by the parent menu.
    
    @property
    @type {Boolean}
    @default NO
  */
  shouldMeasureSize: NO,

  // NOTE: this property could come from the theme at some point, but MenuItemView
  // would have to be migrated to render delegates first. MenuPane adds the
  // necessary padding for now.
  autoResizePadding: 0,
  
  /** @private */
  autoResizeText: function() {
    return this.get('title');
  }.property('title'),

  /** @private */
  autoResizeLayer: function() {
    return this.$('.value')[0];
  }.property('layer').cacheable(),
  
  /** 
    @private
    The batch resize id is computed to be "good enough." It is unlikely that
    multiple menus of different size will need to resize at the same time, but
    we guard against this a little bit by giving it a name based on the menu's guid.
    
    This won't cover cases where the menu has items of multiple sizes, but that's
    an edge case that can address the issue by overriding batchResizeId to null.
  */
  batchResizeId: function() {
    return 'menu-' + SC.guidFor(this.parentMenu);
  }.property().cacheable(),

  /**
   * @private
   * When we render, we recreate all of the DOM, including the element that gets measured.
   * This is a problem because our autoResizeLayer changes. So, we must invalidate that
   * layer whenever we re-render.
   *
   * We need to move menu item rendering into a render delegate. When this happens, there
   * are a few ways we could do it:
   *
   * - Give render delegate method to find clientWidth and return it: 
   *   getMenuItemTitleWidth(dataSource, $)
   *
   * - Make render delegate provide the autoResizeLayer:
   *   In this case, the autoResizeLayer might be a computed property that we invalidate
   *   on didUpdateLayer, and that calls a method like getAutoResizeLayer. Alternatively,
   *   if render delegate properties are added, we could make this one of those, but it
   *   would need some way to access the DOM. Maybe data sources can have $ properties or
   *   methods? Maybe a jQuery property/method?
  */
  didUpdateLayer: function() {
    this.notifyPropertyChange('autoResizeLayer');
    this.scheduleMeasurement();
  }

}) ;


