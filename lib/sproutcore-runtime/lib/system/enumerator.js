// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  An object that iterates over all of the values in an object.

  An instance of this object is returned everytime you call the
  enumerator() method on an object that implements the SC.Enumerable mixin.

  Once you create an enumerator instance, you can call nextObject() on it
  until you can iterated through the entire collection.  Once you have
  exhausted the enumerator, you can reuse it if you want by calling reset().

  @since SproutCore 1.0
*/
SC.Enumerator = function(enumerableObject) {
  this.enumerable = enumerableObject ;
  this.reset() ;
  return this ;
} ;

SC.Enumerator.prototype = /** @scope SC.Enumerator.prototype */{

  /**
    Returns the next object in the enumeration or undefined when complete.

    @returns {Object} the next object or undefined
  */
  nextObject: function() {
    var index = this._index ;
    var len = this._length;
    if (index >= len) return undefined ; // nothing to do

    // get the value
    var ret = this.enumerable.nextObject(index, this._previousObject, this._context) ;
    this._previousObject = ret ;
    this._index = index + 1 ;

    if (index >= len) {
      this._context = SC.Enumerator._pushContext(this._context);
    }

    return ret ;
  },

  /**
    Resets the enumerator to the beginning.  This is a nice way to reuse
    an existing enumerator.

    @returns {Object} this
  */
  reset: function() {
    var e = this.enumerable ;
    if (!e) throw SC.$error("Enumerator has been destroyed");
    this._length = e.get ? e.get('length') : e.length ;
    var len = this._length;
    this._index = 0;
    this._previousObject = null ;
    this._context = (len > 0) ? SC.Enumerator._popContext() : null;
  },

  /**
    Releases the enumerators enumerable object.  You cannot use this object
    anymore.  This is not often needed but it is useful when you need to
    make sure memory gets cleared.

    @returns {Object} null
  */
  destroy: function() {
    this.enumerable = this._length = this._index = this._previousObject = this._context = null;
  }

} ;

/**
  Use this method to manually create a new Enumerator object.  Usually you
  will not access this method directly but instead call enumerator() on the
  item you want to enumerate.

  @param {SC.Enumerable}  enumerableObject enumerable object.
  @returns {SC.Enumerator} the enumerator
*/
SC.Enumerator.create = function(enumerableObject) {
  return new SC.Enumerator(enumerableObject) ;
};

// Private context caching methods.  This avoids recreating lots of context
// objects.

SC.Enumerator._popContext = function() {
  var ret = this._contextCache ? this._contextCache.pop() : null ;
  return ret || {} ;
} ;

SC.Enumerator._pushContext = function(context) {
  this._contextCache = this._contextCache || [] ;
  var cache = this._contextCache;
  cache.push(context);
  return null ;
};

