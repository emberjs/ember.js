// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


sc_require('designers/view_designer');
sc_require('mixins/button');

SC.ButtonView.Designer = SC.ViewDesigner.extend( SC.Button.Designer,
/** @scope SC.ButtonView.Designer.prototype */ {
  
  encodeChildViews: NO,
  
  designProperties: ['theme', 'buttonBehavior', 'href', 'isDefault'],
  
  canResizeVertical: NO,
  
  canResizeHorizontal: YES
  
});