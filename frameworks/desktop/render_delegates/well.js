// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.wellRenderDelegate = SC.RenderDelegate.create({
  className: 'well',
  render: function(dataSource, context) {
    this.includeSlices(dataSource, context, SC.NINE_SLICE);
  },
  
  update: function() {

  }
});
