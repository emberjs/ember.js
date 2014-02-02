// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
 * Renders and updates the HTML representation of a popup button.
 */
SC.BaseTheme.popupButtonRenderDelegate = SC.BaseTheme.buttonRenderDelegate.create({
  render: function(dataSource, context) {
    context.setAttr('aria-haspopup', 'true');
    sc_super();
  },

  update: function(dataSource, jQuery) {
    sc_super();
  }
});
