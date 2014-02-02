// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

 SC.mixin(SC.$.fn, /** @scope SC.$.prototype */ {

  /**
    You can either pass a single class name and a boolean indicating whether
    the value should be added or removed, or you can pass a hash with all
    the class names you want to add or remove with a boolean indicating
    whether they should be there or not.

    This is far more efficient than using addClass/removeClass.

    @param {String|Hash} className class name or hash of classNames + bools
    @param {Boolean} shouldAdd for class name if a string was passed
    @returns {SC.CoreQuery} receiver
  */
  setClass: function(className, shouldAdd) {
    if (SC.none(className)) { return this; } //nothing to do
    var isHash = SC.typeOf(className) !== SC.T_STRING,
        fix = this._fixupClass, key;

    this.each(function() {
      if (this.nodeType !== 1) { return; } // nothing to do

      // collect the class name from the element and build an array
      var classNames = this.className.split(/\s+/), didChange = NO;

      // loop through hash or just fix single className
      if (isHash) {
        for(var key in className) {
          if (className.hasOwnProperty(key)) {
            didChange = fix(classNames, key, className[key]) || didChange;
          }
        }
      } else {
        didChange = fix(classNames, className, shouldAdd);
      }

      // if classNames were changed, join them and set...
      if (didChange) { this.className = classNames.join(' '); }
    });
    return this ;
  },

  /** @private used by setClass */
  _fixupClass: function(classNames, name, shouldAdd) {
    var indexOf = classNames.indexOf(name);
    // if should add, add class...
    if (shouldAdd) {
      if (indexOf < 0) { classNames.push(name); return YES ; }

    // otherwise, null out class name (this will leave some extra spaces)
    } else if (indexOf >= 0) { classNames[indexOf]=null; return YES; }
    return NO ;
  }


});
