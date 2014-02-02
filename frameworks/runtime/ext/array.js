// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/array');

SC.supplement(Array.prototype, SC.CoreArray);

// Because Arrays are dealt with so much, we add specialized functions.

SC.mixin(Array.prototype,
  /** @lends Array.prototype */ {

  // primitive for array support.
  replace: function (idx, amt, objects) {
    if (this.isFrozen) { throw SC.FROZEN_ERROR; }

    var args;
    var len = objects ? (objects.get ? objects.get('length') : objects.length) : 0;

    // Notify that array content is about to mutate.
    this.arrayContentWillChange(idx, amt, len);

    if (len === 0) {
      this.splice(idx, amt);
    } else {
      args = [idx, amt].concat(objects);
      this.splice.apply(this, args);
    }

    // Both arrayContentDidChange and enumerableContentDidChange will invoke
    // "this.notifyPropertyChange('[]')". To prevent multiple notifications
    // these calls are made as grouped property changes.
    this.beginPropertyChanges();
    this.arrayContentDidChange(idx, amt, len);
    this.enumerableContentDidChange(idx, amt, len - amt);
    this.endPropertyChanges();

    return this;
  },

  // If you ask for an unknown property, then try to collect the value
  // from member items.
  unknownProperty: function (key, value) {
    var ret = this.reducedProperty(key, value);
    if ((value !== undefined) && ret === undefined) {
      ret = this[key] = value;
    }
    return ret;
  }

});

if (Array.prototype.indexOf === SC.CoreArray.indexOf) {
  /**
    Returns the index for a particular object in the index.

    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @returns {Number} index of -1 if not found
  */
  Array.prototype.indexOf = function (object, startAt) {
    var idx, len = this.length;

    if (startAt === undefined) startAt = 0;
    else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
    if (startAt < 0) startAt += len;

    for (idx = startAt; idx < len; idx++) {
      if (this[idx] === object) return idx;
    }
    return -1;
  };
}

if (Array.prototype.lastIndexOf === SC.CoreArray.lastIndexOf) {
  /**
    Returns the last index for a particular object in the index.

    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @returns {Number} index of -1 if not found
  */
  Array.prototype.lastIndexOf = function (object, startAt) {
    var idx, len = this.length;

    if (startAt === undefined) startAt = len - 1;
    else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
    if (startAt < 0) startAt += len;

    for (idx = startAt; idx >= 0; idx--) {
      if (this[idx] === object) return idx;
    }
    return -1;
  };
}
