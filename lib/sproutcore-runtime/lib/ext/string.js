// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/runtime');
require('sproutcore-runtime/system/string');

SC.mixin(String.prototype,
/** @lends String.prototype */ {

  /**
    @see SC.String.fmt
  */
  fmt: function() {
    return SC.String.fmt(this, arguments);
  },

  /**
    @see SC.String.w
  */
  w: function() {
    return SC.String.w(this);
  }

});
