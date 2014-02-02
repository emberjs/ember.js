// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @namespace

  Delegate that provides data for a sparse array.  If you set the delegate for
  a sparse array to an object that implements one or more of these methods,
  they will be invoked by the sparse array to fetch data or to update the
  array content as needed.

  Your object does not need to implement all of these methods, but it should
  at least implement the sparseArrayDidRequestIndex() method.

  @since SproutCore 1.0
*/
SC.SparseArrayDelegate = {

  /**
    Invoked when an object requests the length of the sparse array and the
    length has not yet been set.  You can implement this method to update
    the length property of the sparse array immediately or at a later time
    by calling the provideLength() method on the sparse array.

    This method will only be called once on your delegate unless you
    subsequently call provideLength(null) on the array, which will effectively
    "empty" the array and cause the array to invoke the delegate again the
    next time its length is request.

    If you do not set a length on the sparse array immediately, it will return
    a length of 0 until you provide the length.

    @param {SC.SparseArray} sparseArray the array that needs a length.
    @returns {void}
  */
  sparseArrayDidRequestLength: function(sparseArray) {
    // Default does nothing.
  },

  /**
    Invoked when an object requests an index on the sparse array that has not
    yet been set.  You should implement this method to set the object at the
    index using provideObjectAtIndex() or provideObjectsInRange() on the
    sparse array.  You can call these methods immediately during this handler
    or you can wait and call them at a later time once you have loaded any
    data.

    This method will only be called when an index is requested on the sparse
    array that has not yet been filled.  If you have filled an index or range
    and you would like to reset it, call the objectsDidChangeInRange() method
    on the sparse array.

    Note that if you implement the sparseArrayDidRequestRange() method, that
    method will be invoked instead of this one whenever possible to allow you
    to fill in the array with the most efficiency possible.

    @param {SC.SparseArray} sparseArray the sparse array
    @param {Number} index the requested index
    @returns {void}
  */
  sparseArrayDidRequestIndex: function(sparseArray, index) {

  },

  /**
    Alternative method invoked when an object requests an index on the
    sparse array that has not yet been set.  If you set the
    rangeWindowSize property on the Sparse Array, then all object index
    requests will be expanded to to nearest range window and then this
    method will be called with that range.

    You should fill in the passed range by calling the provideObjectsInRange()
    method on the sparse array.

    If you do not implement this method but set the rangeWindowSize anyway,
    then the sparseArrayDidRequestIndex() method will be invoked instead.

    Note that the passed range is a temporary object.  Be sure to clone it if
    you want to keep the range for later use.

    @param {SC.SparseArray} sparseArray the sparse array
    @param {Range} range read only range.
    @returns {void}
  */
  sparseArrayDidRequestRange: function(sparseArray, range) {

  },

  /**
    Optional delegate method you can use to determine the index of a
    particular object.  If you do not implement this method, then the
    sparse array will just search the objects it has loaded already.

    @param {SC.SparseArray} sparseArray the sparse array
    @param {Object} object the object to find the index of
    @return {Number} the index or -1
    @returns {void}
  */
  sparseArrayDidRequestIndexOf: function(sparseArray, object) {

  },

  /**
    Optional delegate method invoked whenever the sparse array attempts to
    changes its contents.  If you do not implement this method or if you
    return NO from this method, then the edit will not be allowed.

    @param {SC.SparseArray} sparseArray the sparse array
    @param {Number} idx the starting index to replace
    @param {Number} amt the number if items to replace
    @param {Array} objects the array of objects to insert
    @returns {Boolean} YES to allow replace, NO to deny
  */
  sparseArrayShouldReplace: function(sparseArray, idx, amt, objects) {
    return NO ;
  },

  /**
    Invoked whenever the sparse array is reset.  Resetting a sparse array
    will cause it to flush its content and go back to the delegate for all
    property requests again.

    @param {SC.SparseArray} sparseArray the sparse array
    @returns {void}
  */
  sparseArrayDidReset: function(sparseArray) {
  }
};
