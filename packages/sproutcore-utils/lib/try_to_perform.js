// ==========================================================================
// Project:   SproutCore
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-utils/responds_to');

var slice = Array.prototype.slice;

var tryToPerform = function(obj, methodName) {
  var args = slice.call(arguments);
  args.shift(); args.shift();
  return SC.respondsTo(obj, methodName) && (obj[methodName].apply(obj, args) !== false);
};

/**
  Checks to see if the `methodName` exists on the `obj`,
  and if it does, invokes it with the arguments passed.

  @function

  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @param {Object...} args The arguments to pass to the method

  @returns {Boolean} true if the method does not return false
  @returns {Boolean} false otherwise
*/
SC.tryToPerform = tryToPerform;

SC.Object.reopen(
/** @scope SC.Object.prototype */{

  tryToPerform: function() {
    var args = slice.call(arguments);
    args.unshift(this);
    return SC.tryToPerform.apply(SC, args);
  }

});