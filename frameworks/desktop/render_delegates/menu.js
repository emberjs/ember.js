// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/picker');

// This is the same as a pickerRenderDelegate, but is named 'menu' instead.
SC.BaseTheme.menuRenderDelegate = SC.BaseTheme.pickerRenderDelegate.create({
  className: 'menu',

  render: function(orig, dataSource, context) {
    this.addSizeClassName(dataSource, context);
    orig(dataSource, context);
  }.enhance(),

  update: function(orig, dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);
    orig(dataSource, jquery);
  }.enhance(),

  // height for items in this menu size
  itemHeight: 20,

  // height of separator items
  itemSeparatorHeight: 9,

  // amount to add to the calculated menu height
  menuHeightPadding: 6,

  // amount to add to any calculated menu width to determine the actual width
  menuWidthPadding: 50,

  minimumMenuWidth: 50,

  submenuOffsetX: 2,
  verticalOffset: 23,

  'sc-tiny-size': {
    itemHeight: 10,
    itemSeparatorHeight: 2,
    menuHeightPadding: 2,
    submenuOffsetX: 0
  },

  'sc-small-size': {
    itemHeight: 16,
    itemSeparatorHeight: 7,
    menuHeightPadding: 4,
    submenuOffsetX: 2
  },

  'sc-large-size': {
    itemHeight: 60,
    itemSeparatorHeight: 20,
    menuHeightPadding: 0,
    submenuOffsetX: 4
  },

  // pretty sure these sizes are wrong, but I copied them from their original
  // values so... please fix.
  'sc-huge-size': {
    itemHeight: 20,
    itemSeparatorHeight: 9,
    menuHeightPadding: 0,
    submenuOffsetX: 0
  }
});
