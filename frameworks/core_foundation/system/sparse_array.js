// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/delegate_support') ;

/**
  @class

  A dynamically filled array.  A SparseArray makes it easy for you to create
  very large arrays of data but then to defer actually populating that array
  until it is actually needed.  This is often much faster than generating an
  array up front and paying the cost to load your data then.

  Although technically all arrays in JavaScript are "sparse" (in the sense
  that you can read and write properties at arbitrary indexes), this array
  keeps track of which elements in the array have been populated already
  and which ones have not.  If you try to get a value at an index that has
  not yet been populated, the SparseArray will notify a delegate object first,
  giving the delegate a chance to populate the component.

  Most of the time, you will use a SparseArray to incrementally load data
  from the server.  For example, if you have a contact list with 3,000
  contacts in it, you may create a SparseArray with a length of 3,000 and set
  that as the content for a ListView.  As the ListView tries to display the
  visible contacts, it will request them from the SparseArray, which will in
  turn notify your delegate, giving you a chance to load the contact data from
  the server.

  @extends SC.Enumerable
  @extends SC.Array
  @extends SC.Observable
  @extends SC.DelegateSupport
  @since SproutCore 1.0
*/

SC.SparseArray = SC.Object.extend(SC.Observable, SC.Enumerable, SC.Array,
  SC.DelegateSupport, /** @scope SC.SparseArray.prototype */ {

  // ..........................................................
  // LENGTH SUPPORT
  //

  _requestingLength: 0,
  _requestingIndex: 0,

  /**
    The length of the sparse array.  The delegate for the array should set
    this length.

    @type Number
  */
  length: function() {
    var del = this.delegate ;
    if (del && SC.none(this._length) && del.sparseArrayDidRequestLength) {
      this._requestingLength++ ;
      del.sparseArrayDidRequestLength(this);
      this._requestingLength-- ;
    }
    return this._length || 0 ;
  }.property().cacheable(),

  /**
    Call this method from a delegate to provide a length for the sparse array.
    If you pass null for this property, it will essentially "reset" the array
    causing your delegate to be called again the next time another object
    requests the array length.

    @param {Number} length the length or null
    @returns {SC.SparseArray} receiver
  */
  provideLength: function(length) {
    var oldLength;
    if (SC.none(length)) this._sa_content = null ;
    if (length !== this._length) {
      oldLength = this._length;
      this._length = length ;
      if (this._requestingLength <= 0) { this.arrayContentDidChange(0, oldLength||0, length||0) ; }
    }
    return this ;
  },

  // ..........................................................
  // READING CONTENT
  //

  /**
    The minimum range of elements that should be requested from the delegate.
    If this value is set to larger than 1, then the sparse array will always
    fit a requested index into a range of this size and request it.

    @type Number
  */
  rangeWindowSize: 1,

  /**
    This array contains all the start_indexes of ranges requested. This is to
    avoid calling sparseArrayDidRequestRange to often. Indexes are removed and
    added as range requests are completed.
  */
  requestedRangeIndex: null,

  /**
    Make sure to create the index array during init so that it is not shared
    between all instances.
  */
  init: function() {
    sc_super();
    this.requestedRangeIndex = [];

    this._TMP_PROVIDE_ARRAY = [];
    this._TMP_PROVIDE_RANGE = { length: 1 };
    this._TMP_RANGE = {};
  },

  /**
    Returns the object at the specified index.  If the value for the index
    is currently undefined, invokes the didRequestIndex() method to notify
    the delegate.

    The omitMaterializing flag ensures that the object will not be materialized,
    but it simply checks for the presence of an object at the specified index
    and will return YES (or undefined if not found). This is useful in the case
    of SparseArrays, where you might NOT want to request the index to be loaded,
    but simply need a shallow check to see if the position has been filled.

    @param {Number} idx the index to get
    @param {Boolean} omitMaterializing
    @return {Object} the object
  */
  objectAt: function(idx, omitMaterializing) {
    var content = this._sa_content, ret ;

    if (idx >= this.get('length')) return undefined;
    if (!content) content = this._sa_content = [] ;
    if ((ret = content[idx]) === undefined) {
      if(!omitMaterializing) this.requestIndex(idx);
      ret = content[idx]; // just in case the delegate provided immediately
    }
    return ret ;
  },

  /**
    Returns the set of indexes that are currently defined on the sparse array.
    If you pass an optional index set, the search will be limited to only
    those indexes.  Otherwise this method will return an index set containing
    all of the defined indexes.  Currently this can be quite expensive if
    you have a lot of indexes defined.

    @param {SC.IndexSet} indexes optional from indexes
    @returns {SC.IndexSet} defined indexes
  */
  definedIndexes: function(indexes) {
    var ret = SC.IndexSet.create(),
        content = this._sa_content,
        idx, len;

    if (!content) return ret.freeze(); // nothing to do

    if (indexes) {
      indexes.forEach(function(idx) {
        if (content[idx] !== undefined) ret.add(idx);
      });
    } else {
      len = content.length;
      for(idx=0;idx<len;idx++) {
        if (content[idx] !== undefined) ret.add(idx);
      }
    }

    return ret.freeze();
  },

  _TMP_RANGE: {},

  /**
    Called by objectAt() whenever you request an index that has not yet been
    loaded.  This will possibly expand the index into a range and then invoke
    an appropriate method on the delegate to request the data.

    It will check if the range has been already requested.

    @param {Number} idx the index to retrieve
    @returns {SC.SparseArray} receiver
  */
  requestIndex: function(idx) {
    var del = this.delegate;
    if (!del) return this; // nothing to do

    // adjust window
    var len = this.get('rangeWindowSize'), start = idx;
    if (len > 1) start = start - Math.floor(start % len);
    if (len < 1) len = 1 ;

    // invoke appropriate callback
    this._requestingIndex++;
    if (del.sparseArrayDidRequestRange) {
      var range = this._TMP_RANGE;
      if(this.wasRangeRequested(start)===-1){
        range.start = start;
        range.length = len;
        this.requestedRangeIndex.push(start);
        del.sparseArrayDidRequestRange(this, range);
      }
    } else if (del.sparseArrayDidRequestIndex) {
      while(--len >= 0) del.sparseArrayDidRequestIndex(this, start + len);
    }
    this._requestingIndex--;

    return this ;
  },

  /*
    This method is called by requestIndex to check if the range has already
    been requested. We assume that rangeWindowSize is not changed often.

     @param {Number} startIndex
     @return {Number} index in requestRangeIndex
  */
  wasRangeRequested: function(rangeStart) {
    var i, ilen;
    for(i=0, ilen=this.requestedRangeIndex.length; i<ilen; i++){
      if(this.requestedRangeIndex[i]===rangeStart) return i;
    }
    return -1;
  },

  /*
    This method has to be called after a request for a range has completed.
    To remove the index from the sparseArray to allow future updates on the
    range.

     @param {Number} startIndex
     @return {Number} index in requestRangeIndex
  */
  rangeRequestCompleted: function(start) {
    var i = this.wasRangeRequested(start);
    if(i>=0) {
      this.requestedRangeIndex.removeAt(i,1);
      return YES;
    }
    return NO;
  },

  /**
    This method sets the content for the specified to the objects in the
    passed array.  If you change the way SparseArray implements its internal
    tracking of objects, you should override this method along with
    objectAt().

    @param {Range} range the range to apply to
    @param {Array} array the array of objects to insert
    @returns {SC.SparseArray} receiver
  */
  provideObjectsInRange: function(range, array) {
    var content = this._sa_content ;
    if (!content) content = this._sa_content = [] ;
    var start = range.start, len = range.length;
    while(--len >= 0) content[start+len] = array.objectAt(len);
    if (this._requestingIndex <= 0) this.arrayContentDidChange(range.start, range.length, range.length);
    return this ;
  },

  /**
    Convenience method to provide a single object at a specified index.  Under
    the covers this calls provideObjectsInRange() so you can override only
    that method and this one will still work.

    @param {Number} index the index to insert
    @param {Object} the object to insert
    @return {SC.SparseArray} receiver
  */
  provideObjectAtIndex: function(index, object) {
    var array = this._TMP_PROVIDE_ARRAY, range = this._TMP_PROVIDE_RANGE;
    array[0] = object;
    range.start = index;
    return this.provideObjectsInRange(range, array);
  },

  /**
    Invalidates the array content in the specified range.  This is not the
    same as editing an array.  Rather it will cause the array to reload the
    content from the delegate again when it is requested.

    @param {Range} the range
    @returns {SC.SparseArray} receiver
  */
  objectsDidChangeInRange: function(range) {

    // delete cached content
    var content = this._sa_content ;
    if (content) {
      // if range covers entire length of cached content, just reset array
      if (range.start === 0 && SC.maxRange(range)>=content.length) {
        this._sa_content = null ;

      // otherwise, step through the changed parts and delete them.
      } else {
        var start = range.start, loc = Math.min(start + range.length, content.length);
        while (--loc>=start) content[loc] = undefined;
      }
    }
    this.arrayContentDidChange(range.start, range.length, range.length) ; // notify
    return this ;
  },

  /**
    Optimized version of indexOf().  Asks the delegate to provide the index
    of the specified object.  If the delegate does not implement this method
    then it will search the internal array directly.

    @param {Object} obj the object to search for
    @returns {Number} the discovered index or -1 if not found
  */
  indexOf: function(obj) {
    var c, ret, del = this.delegate ;
    if (del && del.sparseArrayDidRequestIndexOf) {
      ret = del.sparseArrayDidRequestIndexOf(this, obj);
    }

    if (SC.none(ret)) {
      c = this._sa_content ;
      if (!c) c = this._sa_content = [] ;
      ret = c.indexOf(obj) ;
    }
    return ret;
  },

  // ..........................................................
  // EDITING
  //

  /**
    Array primitive edits the objects at the specified index unless the
    delegate rejects the change.

    @param {Number} idx the index to begin to replace
    @param {Number} amt the number of items to replace
    @param {Array} objects the new objects to set instead
    @returns {SC.SparseArray} receiver
  */
  replace: function(idx, amt, objects) {
    objects = objects || [] ;

    // if we have a delegate, get permission to make the replacement.
    var del = this.delegate ;
    if (del) {
      if (!del.sparseArrayShouldReplace ||
          !del.sparseArrayShouldReplace(this, idx, amt, objects)) {
            return this;
      }
    }

    // go ahead and apply to local content.
    var content = this._sa_content ;
    if (!content) content = this._sa_content = [] ;
    content.replace(idx, amt, objects) ;

    // update length
    var len = objects ? (objects.get ? objects.get('length') : objects.length) : 0;
    var delta = len - amt ;

    this.arrayContentWillChange(idx, amt, len) ;

    if (!SC.none(this._length)) {
      this.propertyWillChange('length');
      this._length += delta;
      this.propertyDidChange('length');
    }

    // Both arrayContentDidChange and enumerableContentDidChange will invoke
    // "this.notifyPropertyChange('[]')". To prevent multiple notifications
    // these calls are made as grouped property changes.
    this.beginPropertyChanges();
    this.arrayContentDidChange(idx, amt, len) ;
    this.enumerableContentDidChange(idx, amt, delta) ;
    this.endPropertyChanges();

    return this ;
  },

  /**
    Resets the SparseArray, causing it to reload its content from the
    delegate again.

    @returns {SC.SparseArray} receiver
  */
  reset: function() {
    var oldLength;
    this._sa_content = null ;
    oldLength = this._length;
    this._length = null ;
    this.arrayContentDidChange(0, oldLength, 0);
    this.invokeDelegateMethod(this.delegate, 'sparseArrayDidReset', this);
    return this ;
  }

}) ;

/**
  Convenience metohd returns a new sparse array with a default length already
  provided.

  @param {Number} len the length of the array
  @returns {SC.SparseArray}
*/
SC.SparseArray.array = function(len) {
  return this.create({ _length: len||0 });
};
