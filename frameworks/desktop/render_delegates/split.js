// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.splitRenderDelegate = SC.RenderDelegate.create({
  className: 'split',

  render: function(dataSource, context) {
    context.addClass(dataSource.get('layoutDirection'));
  },

  update: function(dataSource, jquery) {
    jquery.addClass(dataSource.get('layoutDirection'));
  }
});
