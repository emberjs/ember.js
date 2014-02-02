// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
*/
SC.Function = /** @scope SC.Function.prototype */{

  /**
    @see Function.prototype.property
  */
  property: function (fn, keys) {
    fn.dependentKeys = SC.$A(keys);
    var guid = SC.guidFor(fn);
    fn.cacheKey = "__cache__" + guid;
    fn.lastSetValueKey = "__lastValue__" + guid;
    fn.isProperty = true;
    return fn;
  },

  /**
    @see Function.prototype.cacheable
  */
  cacheable: function (fn, aFlag) {
    fn.isProperty = true;  // also make a property just in case
    if (!fn.dependentKeys) fn.dependentKeys = [];
    fn.isCacheable = (aFlag === undefined) ? true : aFlag;
    return fn;
  },

  /**
    @see Function.prototype.idempotent
  */
  idempotent: function (fn, aFlag) {
    fn.isProperty = true;  // also make a property just in case
    if (!fn.dependentKeys) this.dependentKeys = [];
    fn.isVolatile = (aFlag === undefined) ? true : aFlag;
    return fn;
  },

  /**
    @see Function.prototype.enhance
  */
  enhance: function (fn) {
    fn.isEnhancement = true;
    return fn;
  },

  /**
    @see Function.prototype.observes
  */
  observes: function (fn, propertyPaths) {
    // sort property paths into local paths (i.e just a property name) and
    // full paths (i.e. those with a . or * in them)
    var loc = propertyPaths.length, local = null, paths = null;
    while (--loc >= 0) {
      var path = propertyPaths[loc];
      // local
      if ((path.indexOf('.') < 0) && (path.indexOf('*') < 0)) {
        if (!local) local = fn.localPropertyPaths = [];
        local.push(path);

      // regular
      } else {
        if (!paths) paths = fn.propertyPaths = [];
        paths.push(path);
      }
    }
    return fn;
  }

};
