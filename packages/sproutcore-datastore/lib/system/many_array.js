// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-datastore/attributes/record_attribute');

var get = SC.get, set = SC.set, attrFor = SC.RecordAttribute.attrFor;

/**
  @class

  A `ManyArray` is used to map an array of record ids back to their
  record objects which will be materialized from the owner store on demand.

  Whenever you create a `toMany()` relationship, the value returned from the
  property will be an instance of `ManyArray`.  You can generally customize the
  behavior of ManyArray by passing settings to the `toMany()` helper.

  @extends SC.Enumerable
  @extends SC.Array
  @since SproutCore 1.0
*/

SC.ManyArray = SC.Object.extend(SC.Enumerable, SC.MutableEnumerable, SC.MutableArray, SC.Array,
  /** @scope SC.ManyArray.prototype */ {

  /**
    `recordType` will tell what type to transform the record to when
    materializing the record.

    @default null
    @type String
  */
  recordType: null,

  /**
    If set, the record will be notified whenever the array changes so that
    it can change its own state

    @default null
    @type SC.Record
  */
  record: null,

  /**
    If set will be used by the many array to get an editable version of the
    storeIds from the owner.

    @default null
    @type String
  */
  propertyName: null,


  /**
    The `ManyAttribute` that created this array.

    @default null
    @type SC.ManyAttribute
  */
  manyAttribute: null,

  /**
    The store that owns this record array.  All record arrays must have a
    store to function properly.

    @type SC.Store
    @property
  */
  store: function() {
    return get(get(this, 'record'), 'store');
  }.property('record').cacheable(),

  /**
    The `storeKey` for the parent record of this many array.  Editing this
    array will place the parent record into a `READY_DIRTY` state.

    @type Number
    @property
  */
  storeKey: function() {
    return get(get(this, 'record'), 'storeKey');
  }.property('record').cacheable(),


  /**
    Returns the `storeId`s in read-only mode.  Avoids modifying the record
    unnecessarily.

    @type SC.Array
    @property
  */
  readOnlyStoreIds: function() {
    return get(this, 'record').readAttribute(get(this, 'propertyName'));
  }.property(),


  /**
    Returns an editable array of `storeId`s.  Marks the owner records as
    modified.

    @type {SC.Array}
    @property
  */
  editableStoreIds: function() {
    var store    = get(this, 'store'),
        storeKey = get(this, 'storeKey'),
        pname    = get(this, 'propertyName'),
        ret, hash;

    ret = store.readEditableProperty(storeKey, pname);
    if (!ret) {
      hash = store.readEditableDataHash(storeKey);
      ret = hash[pname] = [];
    }

    if (ret !== this._prevStoreIds) this.recordPropertyDidChange();
    return ret ;
  }.property(),


  // ..........................................................
  // COMPUTED FROM OWNER
  //

  /**
    Computed from owner many attribute

    @type Boolean
    @property
  */
  isEditable: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? get(attr, 'isEditable') : NO;
  }.property('manyAttribute').cacheable(),

  /**
    Computed from owner many attribute

    @type String
    @property
  */
  inverse: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? get(attr, 'inverse') : null;
  }.property('manyAttribute').cacheable(),

  /**
    Computed from owner many attribute

    @type Boolean
    @property
  */
  isMaster: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? get(attr, 'isMaster') : null;
  }.property("manyAttribute").cacheable(),

  /**
    Computed from owner many attribute

    @type Array
    @property
  */
  orderBy: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? get(attr, 'orderBy') : null;
  }.property("manyAttribute").cacheable(),

  // ..........................................................
  // ARRAY PRIMITIVES
  //

  /** @private
    Returned length is a pass-through to the `storeIds` array.

    @type Number
    @property
  */
  length: function() {
    var storeIds = get(this, 'readOnlyStoreIds');
    return storeIds ? get(storeIds, 'length') : 0;
  }.property('readOnlyStoreIds'),

  /** @private
    Looks up the store id in the store ids array and materializes a
    records.
  */
  objectAt: function(idx) {
    var recs      = this._records,
        storeIds  = get(this, 'readOnlyStoreIds'),
        store     = get(this, 'store'),
        recordType = get(this, 'recordType'),
        storeKey, ret, storeId ;

    if (!storeIds || !store) return undefined; // nothing to do
    if (recs && (ret=recs[idx])) return ret ; // cached

    // not in cache, materialize
    if (!recs) this._records = recs = [] ; // create cache
    storeId = storeIds.objectAt(idx);
    if (storeId) {

      // if record is not loaded already, then ask the data source to
      // retrieve it
      storeKey = store.storeKeyFor(recordType, storeId);

      if (store.readStatus(storeKey) === SC.Record.EMPTY) {
        store.retrieveRecord(recordType, null, storeKey);
      }

      recs[idx] = ret = store.materializeRecord(storeKey);
    }
    return ret ;
  },

  /** @private
    Pass through to the underlying array.  The passed in objects must be
    records, which can be converted to `storeId`s.
  */
  replace: function(idx, amt, recs) {

    if (!get(this, 'isEditable')) {
      throw "%@.%@[] is not editable".fmt(get(this, 'record'), get(this, 'propertyName'));
    }

    var storeIds = get(this, 'editableStoreIds'),
        len      = recs ? get(recs, 'length') : 0,
        record   = get(this, 'record'),
        pname    = get(this, 'propertyName'),
        i, keys, ids, toRemove, inverse, attr, inverseRecord;

    // map to store keys
    ids = [] ;
    for(i=0;i<len;i++) ids[i] = get(recs.objectAt(i), 'id');

    // if we have an inverse - collect the list of records we are about to
    // remove
    inverse = get(this, 'inverse');
    if (inverse && amt>0) {
      toRemove = SC.ManyArray._toRemove;
      if (toRemove) SC.ManyArray._toRemove = null; // reuse if possible
      else toRemove = [];

      for(i=0;i<amt;i++) toRemove[i] = this.objectAt(idx + i);
    }

    // pass along - if allowed, this should trigger the content observer
    storeIds.replace(idx, amt, ids);

    // ok, notify records that were removed then added; this way reordered
    // objects are added and removed
    if (inverse) {

      // notive removals
      for(i=0;i<amt;i++) {
        inverseRecord = toRemove[i];
        attr = inverseRecord ? attrFor(inverseRecord, inverse) : null;
        if (attr && attr.inverseDidRemoveRecord) {
          attr.inverseDidRemoveRecord(inverseRecord, inverse, record, pname);
        }
      }

      if (toRemove) {
        toRemove.length = 0; // cleanup
        if (!SC.ManyArray._toRemove) SC.ManyArray._toRemove = toRemove;
      }

      // notify additions
      for(i=0;i<len;i++) {
        inverseRecord = recs.objectAt(i);
        attr = inverseRecord ? attrFor(inverseRecord, inverse) : null;
        if (attr && attr.inverseDidAddRecord) {
          attr.inverseDidAddRecord(inverseRecord, inverse, record, pname);
        }
      }

    }

    // only mark record dirty if there is no inverse or we are master
    if (record && (!inverse || get(this, 'isMaster'))) {
      record.recordDidChange(pname);
    }

    this.enumerableContentDidChange(idx, amt, len - amt);

    return this;
  },

  // ..........................................................
  // INVERSE SUPPORT
  //

  /**
    Called by the `ManyAttribute` whenever a record is removed on the inverse
    of the relationship.

    @param {SC.Record} inverseRecord the record that was removed
    @returns {SC.ManyArray} receiver
  */
  removeInverseRecord: function(inverseRecord) {

    if (!inverseRecord) return this; // nothing to do
    var id = get(inverseRecord, 'id'),
        storeIds = get(this, 'editableStoreIds'),
        idx      = (storeIds && id) ? storeIds.indexOf(id) : -1,
        record;

    if (idx >= 0) {
      storeIds.removeAt(idx);
      if (get(this, 'isMaster') && (record = get(this, 'record'))) {
        record.recordDidChange(get(this, 'propertyName'));
      }
    }

    return this;
  },

  /**
    Called by the `ManyAttribute` whenever a record is added on the inverse
    of the relationship.

    @param {SC.Record} inverseRecord the record this array is a part of
    @returns {SC.ManyArray} receiver
  */
  addInverseRecord: function(inverseRecord) {

    if (!inverseRecord) return this;
    var id = get(inverseRecord, 'id'),
        storeIds = get(this, 'editableStoreIds'),
        orderBy  = get(this, 'orderBy'),
        len      = get(storeIds, 'length'),
        idx, record;

    // find idx to insert at.
    if (orderBy) {
      idx = this._findInsertionLocation(inverseRecord, 0, len, orderBy);
    } else idx = len;

    storeIds.insertAt(idx, get(inverseRecord, 'id'));
    if (get(this, 'isMaster') && (record = get(this, 'record'))) {
      record.recordDidChange(get(this, 'propertyName'));
    }

    return this;
  },

  /** @private
      binary search to find insertion location
  */
  _findInsertionLocation: function(rec, min, max, orderBy) {
    var idx   = min+Math.floor((max-min)/2),
        cur   = this.objectAt(idx),
        order = this._compare(rec, cur, orderBy);
    if (order < 0) {
      if (idx===0) return idx;
      else return this._findInsertionLocation(rec, 0, idx, orderBy);
    } else if (order > 0) {
      if (idx >= max) return idx;
      else return this._findInsertionLocation(rec, idx, max, orderBy);
    } else return idx;
  },

  /** @private
      function to compare to objects
  */
  _compare: function(a, b, orderBy) {
    var t = SC.typeOf(orderBy),
        ret, idx, len;

    if (t === 'function') ret = orderBy(a, b);
    else if (t === 'string') ret = SC.compare(a,b);
    else {
      len = get(orderBy, 'length');
      ret = 0;
      for(idx=0;(ret===0) && (idx<len);idx++) ret = SC.compare(a,b);
    }

    return ret ;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Invoked whenever the `storeIds` array changes.  Observes changes.
  */
  recordPropertyDidChange: function(keys) {

    if (keys && !keys.contains(get(this, 'propertyName'))) return this;

    var storeIds = get(this, 'readOnlyStoreIds'), oldLen, newLen;
    var prev = this._prevStoreIds, f = this._storeIdsContentDidChange;

    if (storeIds === prev) return this; // nothing to do

    if (prev) {
      prev.removeArrayObserver(this, {
        willChange: this.arrayContentWillChange,
        didChange: f
      });

      oldLen = get(prev, 'length');
    } else {
      oldLen = 0;
    }

    if (storeIds) {
      storeIds.addArrayObserver(this, {
        willChange: this.arrayContentWillChange,
        didChange: f
      });

      newLen = get(storeIds, 'length');
    } else {
      newLen = 0;
    }

    this.arrayContentWillChange(0, oldLen, newLen);
    this._prevStoreIds = storeIds;
    this._storeIdsContentDidChange(0, oldLen, newLen);
  },

  /** @private
    Invoked whenever the content of the storeIds array changes.  This will
    dump any cached record lookup and then notify that the enumerable content
    has changed.
  */
  _storeIdsContentDidChange: function(start, removedCount, addedCount) {
    this._records = null ; // clear cache
    this.arrayContentDidChange(start, removedCount, addedCount);
  },

  /** @private */
  init: function() {
    this._super();
    this.recordPropertyDidChange();
  }

}) ;

