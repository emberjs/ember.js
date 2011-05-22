// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2010 Evin Grano
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set, getPath = SC.getPath;

/**
  @class

  A `ChildArray` is used to map an array of `ChildRecord` objects.

  @extends SC.Enumerable
  @extends SC.Array
  @since SproutCore 1.0
*/

SC.ChildArray = SC.Object.extend(SC.Enumerable, SC.Array, SC.MutableEnumerable, SC.MutableArray,
  /** @scope SC.ChildArray.prototype */ {

  /**
    If set, it is the default record `recordType`

    @default null
    @type String
  */
  defaultRecordType: null,

  /**
    If set, the parent record will be notified whenever the array changes so that
    it can change its own state

    @default null
    @type {SC.Record}
  */
  record: null,

  /**
    If set will be used by the many array to get an editable version of the
    `storeId`s from the owner.

    @default null
    @type String
  */
  propertyName: null,

  /**
    Actual references to the hashes

    @default null
    @type {SC.Array}
  */
  children: null,

  /**
    The store that owns this record array.  All record arrays must have a
    store to function properly.

    @type SC.Store
    @property
  */
  store: function() {
    return getPath(this, 'record.store');
  }.property('record').cacheable(),

  /**
    The storeKey for the parent record of this many array.  Editing this
    array will place the parent record into a `READY_DIRTY state.

    @type Number
    @property
  */
  storeKey: function() {
    return getPath(this, 'record.storeKey');
  }.property('record').cacheable(),

  /**
    Returns the storeIds in read only mode.  Avoids modifying the record
    unnecessarily.

    @type SC.Array
    @property
  */
  readOnlyChildren: function() {
    return get(this, 'record').readAttribute(get(this, 'propertyName'));
  }.property(),

  /**
    Returns an editable array of child hashes.  Marks the owner records as
    modified.

    @type {SC.Array}
    @property
  */
  editableChildren: function() {
    var store    = get(this, 'store'),
        storeKey = get(this, 'storeKey'),
        pname    = get(this, 'propertyName'),
        ret, hash;

    ret = store.readEditableProperty(storeKey, pname);
    if (!ret) {
      hash = store.readEditableDataHash(storeKey);
      ret = hash[pname] = [];
    }

    if (ret !== this._prevChildren) this.recordPropertyDidChange();
    return ret ;
  }.property(),

  // ..........................................................
  // ARRAY PRIMITIVES
  //

  /** @private
    Returned length is a pass-through to the storeIds array.

    @type Number
    @property
  */
  length: function() {
    var children = get(this, 'readOnlyChildren');
    return children ? children.length : 0;
  }.property('readOnlyChildren'),

  /**
    Looks up the store id in the store ids array and materializes a
    records.

    @param {Number} idx index of the object to retrieve.
    @returns {SC.Record} The record if found or undefined.
  */
  objectAt: function(idx) {
    var recs      = this._records,
        children = get(this, 'readOnlyChildren'),
        hash, ret, pname = get(this, 'propertyName'),
        parent = get(this, 'record');
    var len = children ? children.length : 0;

    if (!children) return undefined; // nothing to do
    if (recs && (ret=recs[idx])) return ret ; // cached
    if (!recs) this._records = recs = [] ; // create cache

    // If not a good index return undefined
    if (idx >= len) return undefined;
    hash = children.objectAt(idx);
    if (!hash) return undefined;

    // not in cache, materialize
    recs[idx] = ret = parent.registerNestedRecord(hash, pname, pname+'.'+idx);

    return ret;
  },

  /**
    Pass through to the underlying array.  The passed in objects must be
    records, which can be converted to `storeId`s.

    @param {Number} idx index of the object to replace.
    @param {Number} amt number of records to replace starting at idx.
    @param {Number} recs array with records to replace.
    @returns {SC.Record} The record if found or undefined.

  */
  replace: function(idx, amt, recs) {
    var children = get(this, 'editableChildren'),
        len      = recs ? get(recs, 'length') : 0,
        record   = get(this, 'record'), newRecs,

        pname    = get(this, 'propertyName'),
        cr, recordType;
    newRecs = this._processRecordsToHashes(recs);
    children.replace(idx, amt, newRecs);
    // notify that the record did change...
    record.recordDidChange(pname);

    return this;
  },

  /** @private

    Converts a records array into an array of hashes.

    @param {SC.Array} recs records to be converted to hashes.
    @returns {SC.Array} array of hashes.
  */
  _processRecordsToHashes: function(recs){
    var store, sk;
    recs = recs || [];
    recs.forEach( function(me, idx) {
      if (me instanceof SC.Record) {
        store = get(me, 'store');
        sk = get(me, 'storeKey');
        if (sk) recs[idx] = store.readDataHash(sk);
      }
    });

    return recs;
  },

  /**
    Calls normalize on each object in the array
  */
  normalize: function(){
    this.forEach(function(child,id){
      if(child.normalize) child.normalize();
    });
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /**
    Invoked whenever the children array changes.  Observes changes.

    @param {SC.Array} keys optional
    @returns {SC.ChildArray} itself.
  */
  recordPropertyDidChange: function(keys) {
    if (keys && !keys.contains(get(this, 'propertyName'))) return this;

    var children = get(this, 'readOnlyChildren'), oldLen = 0, newLen = 0;
    var prev = this._prevChildren, f = this._childrenContentDidChange;

    if (children === prev) return this; // nothing to do

    if (prev) {
      prev.removeArrayObserver(this, {
        willChange: this.arrayContentWillChange,
        didChange: f
      });

      oldLen = get(prev, 'length');
    }

    if (children) {
      children.addArrayObserver(this, {
        willChange: this.arrayContentWillChange,
        didChange: f
      });

      newLen = get(children, 'length');
    }


    this.arrayContentWillChange(0, oldLen, newLen);
    this._prevChildren = children;
    this._childrenContentDidChange(0, oldLen, newLen);

    return this;
  },

  /** @private
    Invoked whenever the content of the children array changes.  This will
    dump any cached record lookup and then notify that the enumerable content
    has changed.

    @param {Number} target
    @param {Number} key
    @param {Number} value
    @param {Number} rev
  */
  _childrenContentDidChange: function(start, removedCount, addedCount) {
    this._records = null ; // clear cache
    this.arrayContentDidChange(start, removedCount, addedCount);
  },

  /** @private */
  init: function() {
    this._super();
    this.recordPropertyDidChange();
  }

}) ;

