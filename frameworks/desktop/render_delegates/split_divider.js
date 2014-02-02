// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.splitDividerRenderDelegate = SC.RenderDelegate.create({
  className: 'split-divider',
  dividerSize: 1,

  splitPositionOffset: -5,
  splitSizeOffset: 10,

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    // the divider view itself is the grabber, but the visible line
    // may be inside of it.
    context.push("<div class='line'></div>");
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);
  }
});
