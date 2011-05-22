// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime');
require('sproutcore-datastore/system/record');
require('sproutcore-datastore/system/query');
require('sproutcore-indexset');

var get = SC.get, set = SC.set;

/**
  @class

  A `RecordArray` wraps an array of `storeKeys` and, optionally, a `Query`
  object. When you access the items of a `RecordArray`, it will automatically
  convert the `storeKeys` into actual `SC.Record` objects that the rest of
  your application can work with.

  Normally you do not create `RecordArray`s yourself.  Instead, a
  `RecordArray` is returned when you call `SC.Store.findAll()`, already
  properly configured. You can usually just work with the `RecordArray`
  instance just like any other array.

  The information below about `RecordArray` internals is only intended for
  those who need to override this class for some reason to do something
  special.

  Internal Notes
  ---

  Normally the `RecordArray` behavior is very simple.  Any array-like
  operations will be translated into similar calls onto the underlying array
  of `storeKeys`.  The underlying array can be a real array or it may be a
  `SparseArray`, which is how you implement incremental loading.

  If the `RecordArray` is created with an `SC.Query` object as well (and it
  almost always will have a `Query` object), then the `RecordArray` will also
  consult the query for various delegate operations such as determining if
  the record array should update automatically whenever records in the store
  changes. It will also ask the `Query` to refresh the `storeKeys` whenever
  records change in the store.

  If the `SC.Query` object has complex matching rules, it might be
  computationally heavy to match a large dataset to a query. To avoid the
  browser from ever showing a slow script timer in this scenario, the query
  matching is by default paced at 100ms. If query matching takes longer than
  100ms, it will chunk the work with setTimeout to avoid too much computation
  to happen in one runloop.


  @extends SC.Object
  @extends SC.Enumerable
  @extends SC.Array
  @since SproutCore 1.0
*/

SC.RecordArray = SC.Object.extend(SC.Enumerable, SC.Array, SC.MutableEnumerable, SC.MutableArray,
  /** @scope SC.RecordArray.prototype */ {

  /**
    The store that owns this record array.  All record arrays must have a
    store to function properly.

    NOTE: You **MUST** set this property on the `RecordArray` when creating
    it or else it will fail.

    @type SC.Store
  */
  store: null,

  /**
    The `Query` object this record array is based upon.  All record arrays
    **MUST** have an associated query in order to function correctly.  You
    cannot change this property once it has been set.

    NOTE: You **MUST** set this property on the `RecordArray` when creating
    it or else it will fail.

    @type SC.Query
  */
  query: null,

  /**
    The array of `storeKeys` as retrieved from the owner store.

    @type SC.Array
  */
  storeKeys: null,

  /**
    The current status for the record array.  Read from the underlying
    store.

    @type Number
  */
  status: SC.Record.EMPTY,

  /**
    The current editable state based on the query. If this record array is not
    backed by an SC.Query, it is assumed to be editable.

    @property
    @type Boolean
  */
  isEditable: function() {
    var query = get(this, 'query');
    return query ? get(query, 'isEditable') : YES;
  }.property('query').cacheable(),

  // ..........................................................
  // ARRAY PRIMITIVES
  //

  /** @private
    Returned length is a pass-through to the `storeKeys` array.
    @property
  */
  length: function() {
    this.flush(); // cleanup pending changes
    var storeKeys = get(this, 'storeKeys');
    return storeKeys ? get(storeKeys, 'length') : 0;
  }.property('storeKeys').cacheable(),

  /** @private
    A cache of materialized records. The first time an instance of SC.Record is
    created for a store key at a given index, it will be saved to this array.

    Whenever the `storeKeys` property is reset, this cache is also reset.

    @type Array
  */
  _scra_records: null,

  /** @private
    Looks up the store key in the `storeKeys array and materializes a
    records.

    @param {Number} idx index of the object
    @return {SC.Record} materialized record
  */
  objectAt: function(idx) {

    this.flush(); // cleanup pending if needed

    var recs      = this._scra_records,
        storeKeys = get(this, 'storeKeys'),
        store     = get(this, 'store'),
        storeKey, ret ;

    if (!storeKeys || !store) return undefined; // nothing to do
    if (recs && (ret=recs[idx])) return ret ; // cached

    // not in cache, materialize
    if (!recs) this._scra_records = recs = [] ; // create cache
    storeKey = storeKeys.objectAt(idx);

    if (storeKey) {
      // if record is not loaded already, then ask the data source to
      // retrieve it
      if (store.peekStatus(storeKey) === SC.Record.EMPTY) {
        store.retrieveRecord(null, null, storeKey);
      }
      recs[idx] = ret = store.materializeRecord(storeKey);
    }
    return ret ;
  },

  /** @private - optimized forEach loop. */
  forEach: function(callback, target) {
    this.flush();

    var recs      = this._scra_records,
        storeKeys = get(this, 'storeKeys'),
        store     = get(this, 'store'),
        len       = storeKeys ? get(storeKeys, 'length') : 0,
        idx, storeKey, rec;

    if (!storeKeys || !store) return this; // nothing to do
    if (!recs) recs = this._scra_records = [] ;
    if (!target) target = this;

    for(idx=0;idx<len;idx++) {
      rec = recs[idx];
      if (!rec) {
        rec = recs[idx] = store.materializeRecord(storeKeys.objectAt(idx));
      }
      callback.call(target, rec, idx, this);
    }

    return this;
  },

  /** @private
    Replaces a range of records starting at a given index with the replacement
    records provided. The objects to be inserted must be instances of SC.Record
    and must have a store key assigned to them.

    Note that most SC.RecordArrays are *not* editable via `replace()`, since they
    are generated by a rule-based SC.Query. You can check the `isEditable` property
    before attempting to modify a record array.

    @param {Number} idx start index
    @param {Number} amt count of records to remove
    @param {SC.RecordArray} recs the records that should replace the removed records

    @returns {SC.RecordArray} receiver, after mutation has occurred
  */
  replace: function(idx, amt, recs) {

    this.flush(); // cleanup pending if needed

    var storeKeys = get(this, 'storeKeys'),
        len       = recs ? get(recs, 'length') : 0,
        i, keys;

    if (!storeKeys) throw "Unable to edit an SC.RecordArray that does not have its storeKeys property set.";

    if (!get(this, 'isEditable')) throw SC.RecordArray.NOT_EDITABLE;

    // map to store keys
    keys = [] ;
    for(i=0;i<len;i++) keys[i] = get(recs.objectAt(i), 'storeKey');

    // pass along - if allowed, this should trigger the content observer
    storeKeys.replace(idx, amt, keys);
    return this;
  },

  /**
    Returns YES if the passed can be found in the record array.  This is
    provided for compatibility with SC.Set.

    @param {SC.Record} record
    @returns {Boolean}
  */
  contains: function(record) {
    return this.indexOf(record)>=0;
  },

  /** @private
    Returns the first index where the specified record is found.

    @param {SC.Record} record
    @param {Number} startAt optional starting index
    @returns {Number} index
  */
  indexOf: function(record, startAt) {
    if (!(record instanceof  SC.Record)) {
      SC.Logger.warn("Using indexOf on %@ with an object that is not an SC.Record".fmt(record));
      return -1; // only takes records
    }

    this.flush();

    var storeKey  = get(record, 'storeKey'),
        storeKeys = get(this, 'storeKeys');

    return storeKeys ? storeKeys.indexOf(storeKey, startAt) : -1;
  },

  /** @private
    Returns the last index where the specified record is found.

    @param {SC.Record} record
    @param {Number} startAt optional starting index
    @returns {Number} index
  */
  lastIndexOf: function(record, startAt) {
    if (!(record instanceof  SC.Record)) {
      SC.Logger.warn("Using lastIndexOf on %@ with an object that is not an SC.Record".fmt(record));
      return -1; // only takes records
    }

    this.flush();

    var storeKey  = get(record, 'storeKey'),
        storeKeys = get(this, 'storeKeys');
    return storeKeys ? storeKeys.lastIndexOf(storeKey, startAt) : -1;
  },

  /**
    Adds the specified record to the record array if it is not already part
    of the array.  Provided for compatibilty with `SC.Set`.

    @param {SC.Record} record
    @returns {SC.RecordArray} receiver
  */
  add: function(record) {
    if (!(record instanceof  SC.Record)) return this ;
    if (this.indexOf(record)<0) this.pushObject(record);
    return this ;
  },

  /**
    Removes the specified record from the array if it is not already a part
    of the array.  Provided for compatibility with `SC.Set`.

    @param {SC.Record} record
    @returns {SC.RecordArray} receiver
  */
  remove: function(record) {
    if (!(record instanceof  SC.Record)) return this ;
    this.removeObject(record);
    return this ;
  },

  // ..........................................................
  // HELPER METHODS
  //

  /**
    Extends the standard SC.Enumerable implementation to return results based
    on a Query if you pass it in.

    @param {SC.Query} query a SC.Query object
    @param {Object} target the target object to use

    @returns {SC.RecordArray}
  */
  find: function(query, target) {
    if (query && query.isQuery) {
      return get(this, 'store').find(query.queryWithScope(this));
    } else return this._super(query, target);
  },

  /**
    Call whenever you want to refresh the results of this query.  This will
    notify the data source, asking it to refresh the contents.

    @returns {SC.RecordArray} receiver
  */
  refresh: function() {
    get(this, 'store').refreshQuery(get(this, 'query'));
    return this;
  },

  /**
    Will recompute the results based on the `SC.Query` attached to the record
    array. Useful if your query is based on computed properties that might
    have changed. Use `refresh()` instead of you want to trigger a fetch on
    your data source since this will purely look at records already loaded
    into the store.

    @returns {SC.RecordArray} receiver
  */
  reload: function() {
    this.flush(YES);
    return this;
  },

  /**
    Destroys the record array.  Releases any `storeKeys`, and deregisters with
    the owner store.

    @returns {SC.RecordArray} receiver
  */
  destroy: function() {
    if (!get(this, 'isDestroyed')) {
      get(this, 'store').recordArrayWillDestroy(this);
    }

    this._super();
  },

  // ..........................................................
  // STORE CALLBACKS
  //

  // **NOTE**: `storeWillFetchQuery()`, `storeDidFetchQuery()`,
  // `storeDidCancelQuery()`, and `storeDidErrorQuery()` are tested implicitly
  // through the related methods in `SC.Store`.  We're doing it this way
  // because eventually this particular implementation is likely to change;
  // moving some or all of this code directly into the store. -CAJ

  /** @private
    Called whenever the store initiates a refresh of the query.  Sets the
    status of the record array to the appropriate status.

    @param {SC.Query} query
    @returns {SC.RecordArray} receiver
  */
  storeWillFetchQuery: function(query) {
    var status = get(this, 'status'),
        K      = SC.Record;
    if ((status === K.EMPTY) || (status === K.ERROR)) status = K.BUSY_LOADING;
    if (status & K.READY) status = K.BUSY_REFRESH;
    set(this, 'status', status);
    return this ;
  },

  /** @private
    Called whenever the store has finished fetching a query.

    @param {SC.Query} query
    @returns {SC.RecordArray} receiver
  */
  storeDidFetchQuery: function(query) {
    set(this, 'status', SC.Record.READY_CLEAN);
    return this ;
  },

  /** @private
    Called whenever the store has cancelled a refresh.  Sets the
    status of the record array to the appropriate status.

    @param {SC.Query} query
    @returns {SC.RecordArray} receiver
  */
  storeDidCancelQuery: function(query) {
    var status = get(this, 'status'),
        K      = SC.Record;
    if (status === K.BUSY_LOADING) status = K.EMPTY;
    else if (status === K.BUSY_REFRESH) status = K.READY_CLEAN;
    set(this, 'status', status);
    return this ;
  },

  /** @private
    Called whenever the store encounters an error while fetching.  Sets the
    status of the record array to the appropriate status.

    @param {SC.Query} query
    @returns {SC.RecordArray} receiver
  */
  storeDidErrorQuery: function(query) {
    set(this, 'status', SC.Record.ERROR);
    return this ;
  },

  /** @private
    Called by the store whenever it changes the state of certain store keys. If
    the receiver cares about these changes, it will mark itself as dirty and add
    the changed store keys to the _scq_changedStoreKeys index set.

    The next time you try to access the record array, it will call `flush()` and
    add the changed keys to the underlying `storeKeys` array if the new records
    match the conditions of the record array's query.

    @param {SC.Array} storeKeys the effected store keys
    @param {SC.Set} recordTypes the record types for the storeKeys.
    @returns {SC.RecordArray} receiver
  */
  storeDidChangeStoreKeys: function(storeKeys, recordTypes) {
    var query =  get(this, 'query');
    // fast path exits
    if (get(query, 'location') !== SC.Query.LOCAL) return this;
    if (!query.containsRecordTypes(recordTypes)) return this;

    // ok - we're interested.  mark as dirty and save storeKeys.
    var changed = this._scq_changedStoreKeys;
    if (!changed) changed = this._scq_changedStoreKeys = SC.IndexSet.create();
    changed.addEach(storeKeys);

    set(this, 'needsFlush', YES);
    if (get(this, 'storeKeys')) {
      this.flush();
    }

    return this;
  },

  /**
    Applies the query to any pending changed store keys, updating the record
    array contents as necessary.  This method is called automatically anytime
    you access the RecordArray to make sure it is up to date, but you can
    call it yourself as well if you need to force the record array to fully
    update immediately.

    Currently this method only has an effect if the query location is
    `SC.Query.LOCAL`.  You can call this method on any `RecordArray` however,
    without an error.

    @param {Boolean} _flush to force it - use reload() to trigger it
    @returns {SC.RecordArray} receiver
  */
  flush: function(_flush) {
    
    // Are we already inside a flush?  If so, then don't do it again, to avoid
    // never-ending recursive flush calls.  Instead, we'll simply mark
    // ourselves as needing a flush again when we're done.
    if (this._insideFlush) {
      set(this, 'needsFlush', YES);
      return this;
    }

    if (!get(this, 'needsFlush') && !_flush) return this; // nothing to do
    set(this, 'needsFlush', NO); // avoid running again.
    
    // fast exit
    var query = get(this, 'query'),
        store = get(this, 'store');
    if (!store || !query || get(query, 'location') !== SC.Query.LOCAL) {
      return this;
    }

    this._insideFlush = YES;

    // OK, actually generate some results
    var storeKeys = get(this, 'storeKeys'),
        changed   = this._scq_changedStoreKeys,
        didChange = NO,
        K         = SC.Record,
        storeKeysToPace = [],
        startDate = new Date(),
        rec, status, recordType, sourceKeys, scope, included;

    // if we have storeKeys already, just look at the changed keys
    var oldStoreKeys = storeKeys;
    if (storeKeys && !_flush) {

      if (changed) {
        changed.forEach(function(storeKey) {
          if(storeKeysToPace.length>0 || new Date()-startDate>SC.RecordArray.QUERY_MATCHING_THRESHOLD) {
            storeKeysToPace.push(storeKey);
            return;
          }
          // get record - do not include EMPTY or DESTROYED records
          status = store.peekStatus(storeKey);
          if (!(status & K.EMPTY) && !((status & K.DESTROYED) || (status === K.BUSY_DESTROYING))) {
            rec = store.materializeRecord(storeKey);
            included = !!(rec && query.contains(rec));
          } else included = NO ;

          // if storeKey should be in set but isn't -- add it.
          if (included) {
            if (storeKeys.indexOf(storeKey)<0) {
              if (!didChange) storeKeys = storeKeys.copy();
              storeKeys.pushObject(storeKey);
            }
          // if storeKey should NOT be in set but IS -- remove it
          } else {
            if (storeKeys.indexOf(storeKey)>=0) {
              if (!didChange) storeKeys = storeKeys.copy();
              storeKeys.removeObject(storeKey);
            } // if (storeKeys.indexOf)
          } // if (included)

        }, this);
        // make sure resort happens
        didChange = YES ;

      } // if (changed)

      //console.log(this.toString() + ' partial flush took ' + (new Date()-startDate) + ' ms');

    // if no storeKeys, then we have to go through all of the storeKeys
    // and decide if they belong or not.  ick.
    } else {

      // collect the base set of keys.  if query has a parent scope, use that
      if (scope = get(query, 'scope')) {
        sourceKeys = get(scope.flush(), 'storeKeys');
      // otherwise, lookup all storeKeys for the named recordType...
      } else if (recordType = get(query, 'expandedRecordTypes')) {
        sourceKeys = SC.IndexSet.create();
        recordType.forEach(function(cur) {
          sourceKeys.addEach(store.storeKeysFor(recordType));
        });
      }

      // loop through storeKeys to determine if it belongs in this query or
      // not.
      storeKeys = [];
      sourceKeys.forEach(function(storeKey) {
        if(storeKeysToPace.length>0 || new Date()-startDate>SC.RecordArray.QUERY_MATCHING_THRESHOLD) {
          storeKeysToPace.push(storeKey);
          return;
        }

        status = store.peekStatus(storeKey);
        if (!(status & K.EMPTY) && !((status & K.DESTROYED) || (status === K.BUSY_DESTROYING))) {
          rec = store.materializeRecord(storeKey);
          if (rec && query.contains(rec)) storeKeys.push(storeKey);
        }
      });

      //console.log(this.toString() + ' full flush took ' + (new Date()-startDate) + ' ms');

      didChange = YES ;
    }

    // if we reach our threshold of pacing we need to schedule the rest of the
    // storeKeys to also be updated
    if(storeKeysToPace.length>0) {
      var self = this;
      // use setTimeout here to guarantee that we hit the next runloop,
      // and not the same runloop which the invoke* methods do not guarantee
      window.setTimeout(function() {
        SC.run(function() {
          if(!self || get(self, 'isDestroyed')) return;
          set(self, 'needsFlush', YES);
          self._scq_changedStoreKeys = SC.IndexSet.create().addEach(storeKeysToPace);
          self.flush();
        });
      }, 1);
    }

    // clear set of changed store keys
    if (changed) changed.clear();

    // only resort and update if we did change
    if (didChange) {

      // storeKeys must be a new instance because orderStoreKeys() works on it
      if (storeKeys && (storeKeys===oldStoreKeys)) {
        storeKeys = storeKeys.copy();
      }

      storeKeys = SC.Query.orderStoreKeys(storeKeys, query, store);
      if (SC.compare(oldStoreKeys, storeKeys) !== 0){
        set(this, 'storeKeys', SC.copy(storeKeys)); // replace content
      }
    }

    this._insideFlush = NO;
    return this;
  },

  /**
    Set to `YES` when the query is dirty and needs to update its storeKeys
    before returning any results.  `RecordArray`s always start dirty and become
    clean the first time you try to access their contents.

    @type Boolean
  */
  needsFlush: YES,

  // ..........................................................
  // EMULATE SC.StoreError API
  //

  /**
    Returns `YES` whenever the status is `SC.Record.ERROR`.  This will allow
    you to put the UI into an error state.

    @property
    @type Boolean
  */
  isError: function() {
    return get(this, 'status') & SC.Record.ERROR;
  }.property('status').cacheable(),

  /**
    Returns the receiver if the record array is in an error state.  Returns
    `null` otherwise.

    @property
    @type SC.Record
  */
  errorValue: function() {
    return get(this, 'isError') ? SC.val(get(this, 'errorObject')) : null ;
  }.property('isError').cacheable(),

  /**
    Returns the current error object only if the record array is in an error
    state. If no explicit error object has been set, returns
    `SC.Record.GENERIC_ERROR.`

    @property
    @type SC.StoreError
  */
  errorObject: function() {
    if (get(this, 'isError')) {
      var store = get(this, 'store');
      return store.readQueryError(get(this, 'query')) || SC.Record.GENERIC_ERROR;
    } else return null ;
  }.property('isError').cacheable(),

  // ..........................................................
  // INTERNAL SUPPORT
  //

  propertyWillChange: function(key) {
    if (key === 'storeKeys') {
      var storeKeys = get(this, 'storeKeys');
      var len = storeKeys ? get(storeKeys, 'length') : 0;

      this.arrayContentWillChange(0, len, 0);
    }

    return this._super(key);
  },

  /** @private
    Invoked whenever the `storeKeys` array changes.  Observes changes.
  */
  _storeKeysDidChange: function() {
    var storeKeys = get(this, 'storeKeys');

    var prev = this._prevStoreKeys, oldLen, newLen,
        f    = this._storeKeysContentDidChange,
        fs   = this._storeKeysStateDidChange;

    if (storeKeys === prev) { return; } // nothing to do
    oldLen = prev ? get(prev, 'length') : 0;
    newLen = storeKeys ? get(storeKeys, 'length') : 0;

    this._storeKeysContentWillChange(prev, 0, oldLen, newLen);

    if (prev) {
      prev.removeArrayObserver(this, {
        willChange: this._storeKeysContentWillChange,
        didChange: this._storeKeysContentDidChange
      });
    }

    this._prevStoreKeys = storeKeys;
    if (storeKeys) {
      storeKeys.addArrayObserver(this, {
        willChange: this._storeKeysContentWillChange,
        didChange: this._storeKeysContentDidChange
      });
    }

    this._storeKeysContentDidChange(storeKeys, 0, oldLen, newLen);

  }.observes('storeKeys'),

  /** @private
    If anyone adds an array observer on to the record array, make sure
    we flush so that the observers don't fire the first time length is
    calculated.
  */
  addArrayObserver: function() {
    this.flush();
    return this._super.apply(this, arguments);
  },

  _storeKeysContentWillChange: function(target, start, removedCount, addedCount) {
    this.arrayContentWillChange(start, removedCount, addedCount);
  },
  
  /** @private
    Invoked whenever the content of the `storeKeys` array changes.  This will
    dump any cached record lookup and then notify that the enumerable content
    has changed.
  */
  _storeKeysContentDidChange: function(target, start, removedCount, addedCount) {
    if (this._scra_records) this._scra_records.length=0 ; // clear cache

    this.arrayContentDidChange(start, removedCount, addedCount);
  },

  /** @private */
  init: function() {
    this._super();
    this._storeKeysDidChange();
  }

});

SC.RecordArray.reopenClass(/** @scope SC.RecordArray.prototype */{

  /**
    Standard error throw when you try to modify a record that is not editable

    @type SC.StoreError
  */
  NOT_EDITABLE: SC.StoreError.desc("SC.RecordArray is not editable"),

  /**
    Number of milliseconds to allow a query matching to run for. If this number
    is exceeded, the query matching will be paced so as to not lock up the
    browser (by essentially splitting the work with a setTimeout)

    @type Number
  */
  QUERY_MATCHING_THRESHOLD: 100
});

