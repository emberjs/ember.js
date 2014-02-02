// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


sc_require('designers/view_designer');

SC.LabelView.Designer = SC.ViewDesigner.extend(
/** @scope SC.LabelView.Designer.prototype */ {
  
  encodeChildViews: NO,
  
  designProperties: ['value', 'escapeHTML']
  
});