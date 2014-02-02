// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('models/record');

/**
  @class
  @deprecated SC.ChildRecord is deprecated. Please extend SC.Record instead.
*/
SC.ChildRecord = SC.Record.extend({});

SC.ChildRecord.extend = function() {
  // @if (debug)
  SC.warn("Developer Warning: SC.ChildRecord is deprecated. Please extend SC.Record instead.");
  // @endif
  return SC.Record.extend.apply(this, arguments);
};
