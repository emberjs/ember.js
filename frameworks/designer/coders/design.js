// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/* evil:true */

sc_require('coders/object');

/** @class

  A DesignCoder encodes specifically the design for a set of views.
  
  @extends SC.ObjectCoder
*/
SC.DesignCoder = SC.ObjectCoder.extend({
  extendMethodName: 'design',
  encodeMethodName: 'encodeDesign'  
});