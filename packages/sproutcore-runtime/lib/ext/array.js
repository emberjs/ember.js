// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/runtime');
require('sproutcore-runtime/mixins/array');
require('sproutcore-runtime/mixins/copyable');
require('sproutcore-runtime/mixins/freezable');
require('sproutcore-runtime/mixins/observable');

SC.mixin(Array.prototype, SC.Freezable);
SC.mixin(Array.prototype, SC.Copyable);

/**
  @param {Boolean} deep If true, a deep copy of the object should be made.
  @returns {Array} Copy of the array
*/
Array.prototype.copy = function(deep) {
  var ret = this.slice(),
      idx;

  if (deep) {
    idx = ret.length;
    while (idx--) {
      ret[idx] = SC.copy(ret[idx], true);
    }
  }
  return ret;
};

SC.supplement(Array.prototype, SC.CoreArray);

// Because Arrays are dealt with so much, we add specialized functions.
SC.mixin(Array.prototype,
/** @lends Array.prototype */{

  /**
    @see SC.Enumerable.replace
  */
  replace: function(idx, amt, objects) {
    if (this.isFrozen) { throw SC.FROZEN_ERROR; }

    var args;
    var len = objects ? (objects.get ? objects.get('length') : objects.length) : 0;

    // Notify that array content is about to mutate.
    this.arrayContentWillChange(idx, amt, len);

    if (len === 0) {
      this.splice(idx, amt);
    } else {
      args = [idx, amt].concat(objects);
      this.splice.apply(this,args);
    }

    this.arrayContentDidChange(idx, amt, len);
    this.enumerableContentDidChange(idx, amt, len - amt);
    return this;
  }

});

if (Array.prototype.indexOf === SC.CoreArray.indexOf) {
  /**
    Returns the index for a particular object in the index.

    @param {Object} object the item to search for
    @param {NUmber} startAt optional starting location to search, default 0
    @returns {Number} index of -1 if not found
  */
  Array.prototype.indexOf = function(object, startAt) {
    var idx, len = this.length;

    if (startAt === undefined) { startAt = 0; }
    else { startAt = startAt < 0 ? Math.ceil(startAt) : Math.floor(startAt); }

    if (startAt < 0) { startAt += len; }

    for(idx = startAt; idx < len; idx++) {
      if (this[idx] === object) { return idx; }
    }

    return -1;
  };
}

if (Array.prototype.lastIndexOf === SC.CoreArray.lastIndexOf) {
  /**
    Returns the last index for a particular object in the index.

    @param {Object} object the item to search for
    @param {NUmber} startAt optional starting location to search, default 0
    @returns {Number} index of -1 if not found
  */
  Array.prototype.lastIndexOf = function(object, startAt) {
    var idx, len = this.length;

    if (startAt === undefined) { startAt = len-1; }
    else { startAt = startAt < 0 ? Math.ceil(startAt) : Math.floor(startAt); }

    if (startAt < 0) { startAt += len; }

    for(idx = startAt; idx >= 0; idx--) {
      if (this[idx] === object) { return idx; }
    }

    return -1;
  };
}

SC.supplement(Array.prototype, SC.Observable);
