// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/*jslint evil:true */

/** 
  Extend `SC.View` with `emitDesign()` which will encode the view and all of its
  subviews then computes an empty element to attach to the design.
*/
SC.View.prototype.emitDesign = function() {
  
  // get design...
  var ret = SC.DesignCoder.encode(this);
  
  return ret ;
};

/** 
  Patch `SC.View` to respond to `encodeDesign()`.  This will proxy to the
  paired designer, if there is one.  If there is no paired designer, returns
  `NO`.
*/
SC.View.prototype.encodeDesign = function(coder) {
  return this.designer ? this.designer.encodeDesign(coder) : NO ;
};
