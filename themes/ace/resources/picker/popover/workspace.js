// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.AceTheme.Popover.workspaceRenderDelegate = SC.RenderDelegate.create({
  className: 'workspace',
  render: function(dataSource, context) {
    context.setClass({
      'top-toolbar': dataSource.get('hasTopToolbar'),
      'bottom-toolbar': dataSource.get('hasBottomToolbar')
    });
    
    context = context.begin('div').addClass('popover-background');
    this.includeSlices(dataSource, context, SC.NINE_SLICE);
    context.push("<div class = 'sc-pointer'></div>");
    context = context.end();
  },

  update: function(dataSource, jquery) {
    jquery.setClass({
      'top-toolbar': dataSource.get('hasTopToolbar'),
      'bottom-toolbar': dataSource.get('hasBottomToolbar')
    });
  }
});