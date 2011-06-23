// ==========================================================================
// Project:   SproutCore
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var slice = Array.prototype.slice;

var respondsTo = function(obj, methodName) {
  return !!(obj[methodName] instanceof Function);
};

/**
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
*/
SC.respondsTo = respondsTo;

SC.Object.reopen(
/** @scope SC.Object.prototype */{

  respondsTo: function() {
    var args = slice.call(arguments);
    args.unshift(this);
    return SC.respondsTo.apply(SC, args);
  }

});