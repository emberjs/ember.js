// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BaseTheme.menuScrollerRenderDelegate = SC.RenderDelegate.create({
  className: 'menu-scroller',

  render: function (dataSource, context) {
    this.addSizeClassName(dataSource, context);
    context.addClass({
      'sc-vertical': YES,
      disabled: !dataSource.get('isEnabled')
    });
    context.push('<span class="scrollArrow ' + (dataSource.get('scrollDown') ? 'arrowDown' : 'arrowUp') + '">&nbsp;</span>');
  },

  update: function (dataSource, context) {
    this.addSizeClassName(dataSource, context);
    context.addClass({
      'sc-vertical': YES,
      disabled: !dataSource.get('isEnabled')
    });
  }
});
