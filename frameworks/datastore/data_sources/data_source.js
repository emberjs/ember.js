// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Indicates a value has a mixed state of both on and off.

  @type String
*/
SC.MIXED_STATE = '__MIXED__';

/** @class

  A DataSource connects an in-memory store to one or more server backends.
  To connect to a data backend on a server, subclass `SC.DataSource`
  and implement the necessary data source methods to communicate with the
  particular backend.

  ## Create a Data Source

  To implement the data source, subclass `SC.DataSource` in a file located
  either in the root level of your app or framework, or in a directory
  called "data_sources":

      MyApp.DataSource = SC.DataSource.extend({
        // implement the data source API...
      });

  ## Connect to a Data Source

  New SproutCore applications are wired up to fixtures as their data source.
  When you are ready to connect to a server, swap the use of fixtures with a
  call to the desired data source.

  In core.js:

      // change...
      store: SC.Store.create().from(SC.Record.fixtures)

      // to...
      store: SC.Store.create().from('MyApp.DataSource')

  Note that the data source class name is referenced by string since the file
  in which it is defined may not have been loaded yet. The first time a
  data store tries to access its data source it will look up the class name
  and instantiate that data source.

  ## Implement the Data Source API

  There are three methods that a data store invokes on its data source:

   * `fetch()` &mdash; called the first time you try to `find()` a query
     on a store or any time you refresh the record array after that.
   * `retrieveRecords()` &mdash; called when you access an individual
     record that has not been loaded yet
   * `commitRecords()` &mdash; called if the the store has changes
     pending and its `commitRecords()` method is invoked.

  The data store will call the `commitRecords()` method when records
  need to be created, updated, or deleted. If the server that the data source
  connects to handles these three actions in a uniform manner, it may be
  convenient to implement the `commitRecords()` to handle record
  creation, updating, and deletion.

  However, if the calls the data source will need to make to the server to
  create, update, and delete records differ from each other to a significant
  enough degree, it will be more convenient to rely on the default behavior
  of `commitRecords()` and instead implement the three methods that
  it will call by default:

   * `createRecords()` &mdash; called with a list of records that are new
     and need to be created on the server.
   * `updateRecords()` &mdash; called with a list of records that already
      exist on the server but that need to be updated.
   * `destroyRecords()` &mdash; called with a list of records that should
     be deleted on the server.

  ### Multiple records

  The `retrieveRecords()`, `createRecords()`, `updateRecords()` and
  `destroyRecords()` methods all work on multiple records. If your server
  API accommodates calls where you can  pass a list of records, this might
  be the best level at which to implement the Data Source API. On the other
  hand, if the server requires that you send commands for it for individual
  records, you can rely on the default implementation of these four methods,
  which will call the following for each individual record, one at a time:

   - `retrieveRecord()` &mdash; called to retrieve a single record.
   - `createRecord()` &mdash; called to create a single record.
   - `updateRecord()` &mdash; called to update a single record.
   - `destroyRecord()` &mdash; called to destroy a single record.


  ### Return Values

  All of the methods you implement must return one of three values:
   - `YES` &mdash; all the records were handled.
   - `NO` &mdash; none of the records were handled.
   - `SC.MIXED_STATE` &mdash; some, but not all of the records were handled.


  ### Store Keys

  Whenever a data store invokes one of the data source methods it does so
  with a storeKeys or storeKey argument. Store keys are transient integers
  assigned to each data hash when it is first loaded into the store. It is
  used to track data hashes as they move up and down nested stores (even if
  no associated record is ever created from it).

  When passed a storeKey you can use it to retrieve the status, data hash,
  record type, or record ID, using the following data store methods:

   * `readDataHash(storeKey)` &mdash; returns the data hash associated with
     a store key, if any.
   * `readStatus(storeKey)` &mdash; returns the current record status
     associated with the store key. May be `SC.Record.EMPTY`.
   * `SC.Store.recordTypeFor(storeKey)` &mdash; returns the record type for
     the associated store key.
   * `recordType.idFor(storeKey)` &mdash; returns the record ID for
     the associated store key. You must call this method on `SC.Record`
     subclass itself, not on an instance of `SC.Record`.

  These methods are safe for reading data from the store. To modify data
  in the data store you must use the store callbacks described below. The
  store callbacks will ensure that the record states remain consistent.

  ### Store Callbacks

  When a data store calls a data source method, it puts affected records into
  a `BUSY` state. To guarantee data integrity and consistency, these records
  cannot be modified by the rest of the application while they are in the `BUSY`
  state.

  Because records are "locked" while in the `BUSY` state, it is the data source's
  responsibility to invoke a callback on the store for each record or query that
  was passed to it and that the data source handled. To reduce the amount of work
  that a data source must do, the data store will automatically unlock the relevant
  records if the the data source method returned `NO`, indicating that the records
  were unhandled.

  Although a data source can invoke callback methods at any time, they should
  usually be invoked after receiving a response from the server. For example, when
  the data source commits a change to a record by issuing a command to the server,
  it waits for the server to acknowledge the command before invoking the
  `dataSourceDidComplete()` callback.

  In some cases a data source may be able to assume a server's response and invoke
  the callback on the store immediately. This can improve performance because the
  record can be unlocked right away.


  ### Record-Related Callbacks

  When `retrieveRecords()`, `commitRecords()`, or any of the related methods are
  called on a data source, the store puts any records to be handled by the data
  store in a `BUSY` state. To release the records the data source must invoke one
  of the record-related callbacks on the store:

   * `dataSourceDidComplete(storeKey, dataHash, id)` &mdash; the most common
     callback. You might use this callback when you have retrieved a record to
     load its contents into the store. The callback tells the store that the data
     source is finished with the storeKey in question. The `dataHash` and `id`
     arguments are optional and will replace the current dataHash and/or id. Also
     see "Loading Records" below.
   * `dataSourceDidError(storeKey, error)` &mdash; a data source should call this
     when a request could not be completed because an error occurred. The error
     argument is optional and can contain more information about the error.
   * `dataSourceDidCancel(storeKey)` &mdash; a data source should call this when
     an operation is cancelled for some reason. This could be used when the user
     is able to cancel an operation that is in progress.

  ### Loading Records into the Store

  Instead of orchestrating multiple `dataSourceDidComplete()` callbacks when loading
  multiple records, a data source can call the `loadRecords()` method on the store,
  passing in a `recordType`, and array of data hashes, and optionally an array of ids.
  The `loadRecords()` method takes care of looking up storeKeys and calling the
  `dataSourceDidComplete()` callback as needed.

  `loadRecords()` is often the most convenient way to get large blocks of data into
  the store, especially in response to a `fetch()` or `retrieveRecords()` call.


  ### Query-Related Callbacks

  Like records, queries that are passed through the `fetch()` method also have an
  associated status property; accessed through the `status`  property on the record
  array returned from `find()`. To properly reset this status, a data source must
  invoke an appropriate query-related callback on the store. The callbacks for
  queries are similar to those for records:

   * `dataSourceDidFetchQuery(query)` &mdash; the data source must call this when
     it has completed fetching any related data for the query. This returns the
     query results (i.e. the record array) status into a `READY` state.
   * `dataSourceDidErrorQuery(query, error)` &mdash; the data source should call
     this if it encounters an error in executing the query. This puts the query
     results into an `ERROR` state.
   * `dataSourceDidCancelQuery(query)` &mdash; the data source should call this
     if loading the results is cancelled.

  In addition to these callbacks, the method `loadQueryResults(query, storeKey)`
  is used by data sources when handling remote queries. This method is similar to
  `dataSourceDidFetchQuery()`, except that you also provide an array of storeKeys
  (or a promise to provide store keys) that comprises the result set.

  @extend SC.Object
  @since SproutCore 1.0
*/
SC.DataSource = SC.Object.extend( /** @scope SC.DataSource.prototype */ {

  // ..........................................................
  // SC.STORE ENTRY POINTS
  //


  /**

    Invoked by the store whenever it needs to retrieve data matching a
    specific query, triggered by find().  This method is called anytime
    you invoke SC.Store#find() with a query or SC.RecordArray#refresh().  You
    should override this method to actually retrieve data from the server
    needed to fulfill the query.  If the query is a remote query, then you
    will also need to provide the contents of the query as well.

    ### Handling Local Queries

    Most queries you create in your application will be local queries.  Local
    queries are populated automatically from whatever data you have in memory.
    When your fetch() method is called on a local queries, all you need to do
    is load any records that might be matched by the query into memory.

    The way you choose which queries to fetch is up to you, though usually it
    can be something fairly straightforward such as loading all records of a
    specified type.

    When you finish loading any data that might be required for your query,
    you should always call SC.Store#dataSourceDidFetchQuery() to put the query
    back into the READY state.  You should call this method even if you choose
    not to load any new data into the store in order to notify that the store
    that you think it is ready to return results for the query.

    ### Handling Remote Queries

    Remote queries are special queries whose results will be populated by the
    server instead of from memory.  Usually you will only need to use this
    type of query when loading large amounts of data from the server.

    Like Local queries, to fetch a remote query you will need to load any data
    you need to fetch from the server and add the records to the store.  Once
    you are finished loading this data, however, you must also call
    SC.Store#loadQueryResults() to actually set an array of storeKeys that
    represent the latest results from the server.  This will implicitly also
    call datasSourceDidFetchQuery() so you don't need to call this method
    yourself.

    If you want to support incremental loading from the server for remote
    queries, you can do so by passing a SC.SparseArray instance instead of
    a regular array of storeKeys and then populate the sparse array on demand.

    ### Handling Errors and Cancellations

    If you encounter an error while trying to fetch the results for a query
    you can call SC.Store#dataSourceDidErrorQuery() instead.  This will put
    the query results into an error state.

    If you had to cancel fetching a query before the results were returned,
    you can instead call SC.Store#dataSourceDidCancelQuery().  This will set
    the query back into the state it was in previously before it started
    loading the query.

    ### Return Values

    When you return from this method, be sure to return a Boolean.  YES means
    you handled the query, NO means you can't handle the query.  When using
    a cascading data source, returning NO will mean the next data source will
    be asked to fetch the same results as well.

    @param {SC.Store} store the requesting store
    @param {SC.Query} query query describing the request
    @returns {Boolean} YES if you can handle fetching the query, NO otherwise
  */
  fetch: function(store, query) {
    return NO ; // do not handle anything!
  },

  /**
    Called by the store whenever it needs to load a specific set of store
    keys.  The default implementation will call retrieveRecord() for each
    storeKey.

    You should implement either retrieveRecord() or retrieveRecords() to
    actually fetch the records referenced by the storeKeys .

    @param {SC.Store} store the requesting store
    @param {Array} storeKeys
    @param {Array} ids - optional
    @returns {Boolean} YES if handled, NO otherwise
  */
  retrieveRecords: function(store, storeKeys, ids) {
    return this._handleEach(store, storeKeys, this.retrieveRecord, ids);
  },

  /**
    Invoked by the store whenever it has one or more records with pending
    changes that need to be sent back to the server.  The store keys will be
    separated into three categories:

     - `createStoreKeys`: records that need to be created on server
     - `updateStoreKeys`: existing records that have been modified
     - `destroyStoreKeys`: records need to be destroyed on the server

    If you do not override this method yourself, this method will actually
    invoke `createRecords()`, `updateRecords()`, and `destroyRecords()` on the
    dataSource, passing each array of storeKeys.  You can usually implement
    those methods instead of overriding this method.

    However, if your server API can sync multiple changes at once, you may
    prefer to override this method instead.

    To support cascading data stores, be sure to return `NO` if you cannot
    handle any of the keys, `YES` if you can handle all of the keys, or
    `SC.MIXED_STATE` if you can handle some of them.

    @param {SC.Store} store the requesting store
    @param {Array} createStoreKeys keys to create
    @param {Array} updateStoreKeys keys to update
    @param {Array} destroyStoreKeys keys to destroy
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} YES if data source can handle keys
  */
  commitRecords: function(store, createStoreKeys, updateStoreKeys, destroyStoreKeys, params) {
    var uret, dret, ret;
    if (createStoreKeys.length>0) {
      ret = this.createRecords.call(this, store, createStoreKeys, params);
    }

    if (updateStoreKeys.length>0) {
      uret = this.updateRecords.call(this, store, updateStoreKeys, params);
      ret = SC.none(ret) ? uret : (ret === uret) ? ret : SC.MIXED_STATE;
    }

    if (destroyStoreKeys.length>0) {
      dret = this.destroyRecords.call(this, store, destroyStoreKeys, params);
      ret = SC.none(ret) ? dret : (ret === dret) ? ret : SC.MIXED_STATE;
    }

    return ret || NO;
  },

  /**
    Invoked by the store whenever it needs to cancel one or more records that
    are currently in-flight.  If any of the storeKeys match records you are
    currently acting upon, you should cancel the in-progress operation and
    return `YES`.

    If you implement an in-memory data source that immediately services the
    other requests, then this method will never be called on your data source.

    To support cascading data stores, be sure to return `NO` if you cannot
    retrieve any of the keys, `YES` if you can retrieve all of the, or
    `SC.MIXED_STATE` if you can retrieve some of the.

    @param {SC.Store} store the requesting store
    @param {Array} storeKeys array of storeKeys to retrieve
    @returns {Boolean} YES if data source can handle keys
  */
  cancel: function(store, storeKeys) {
    return NO;
  },

  // ..........................................................
  // BULK RECORD ACTIONS
  //

  /**
    Called from `commitRecords()` to commit modified existing records to the
    store.  You can override this method to actually send the updated
    records to your store.  The default version will simply call
    `updateRecord()` for each storeKey.

    To support cascading data stores, be sure to return `NO` if you cannot
    handle any of the keys, `YES` if you can handle all of the keys, or
    `SC.MIXED_STATE` if you can handle some of them.

    @param {SC.Store} store the requesting store
    @param {Array} storeKeys keys to update
    @param {Hash} params
      to be passed down to data source. originated from the commitRecords()
      call on the store

    @returns {Boolean} YES, NO, or SC.MIXED_STATE

  */
  updateRecords: function(store, storeKeys, params) {
    return this._handleEach(store, storeKeys, this.updateRecord, null, params);
  },

  /**
    Called from `commitRecords()` to commit newly created records to the
    store.  You can override this method to actually send the created
    records to your store.  The default version will simply call
    `createRecord()` for each storeKey.

    To support cascading data stores, be sure to return `NO` if you cannot
    handle any of the keys, `YES` if you can handle all of the keys, or
    `SC.MIXED_STATE` if you can handle some of them.

    @param {SC.Store} store the requesting store
    @param {Array} storeKeys keys to update

    @param {Hash} params
      to be passed down to data source. originated from the commitRecords()
      call on the store

    @returns {Boolean} YES, NO, or SC.MIXED_STATE

  */
  createRecords: function(store, storeKeys, params) {
    return this._handleEach(store, storeKeys, this.createRecord, null, params);
  },

  /**
    Called from `commitRecords()` to commit destroyed records to the
    store.  You can override this method to actually send the destroyed
    records to your store.  The default version will simply call
    `destroyRecord()` for each storeKey.

    To support cascading data stores, be sure to return `NO` if you cannot
    handle any of the keys, `YES` if you can handle all of the keys, or
    `SC.MIXED_STATE` if you can handle some of them.

    @param {SC.Store} store the requesting store
    @param {Array} storeKeys keys to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store

    @returns {Boolean} YES, NO, or SC.MIXED_STATE

  */
  destroyRecords: function(store, storeKeys, params) {
    return this._handleEach(store, storeKeys, this.destroyRecord, null, params);
  },

  /** @private
    invokes the named action for each store key.  returns proper value
  */
  _handleEach: function(store, storeKeys, action, ids, params) {
    var len = storeKeys.length, idx, ret, cur, idOrParams;

    for(idx=0;idx<len;idx++) {
      idOrParams = ids ? ids[idx] : params;

      cur = action.call(this, store, storeKeys[idx], idOrParams);
      if (ret === undefined) {
        ret = cur ;
      } else if (ret === YES) {
        ret = (cur === YES) ? YES : SC.MIXED_STATE ;
      } else if (ret === NO) {
        ret = (cur === NO) ? NO : SC.MIXED_STATE ;
      }
    }
    return !SC.none(ret) ? ret : null ;
  },


  // ..........................................................
  // SINGLE RECORD ACTIONS
  //

  /**
    Called from `updatesRecords()` to update a single record.  This is the
    most basic primitive to can implement to support updating a record.

    To support cascading data stores, be sure to return `NO` if you cannot
    handle the passed storeKey or `YES` if you can.

    @param {SC.Store} store the requesting store
    @param {Array} storeKey key to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} YES if handled
  */
  updateRecord: function(store, storeKey, params) {
    return NO ;
  },

  /**
    Called from `retrieveRecords()` to retrieve a single record.

    @param {SC.Store} store the requesting store
    @param {Array} storeKey key to retrieve
    @param {String} id the id to retrieve
    @returns {Boolean} YES if handled
  */
  retrieveRecord: function(store, storeKey, id) {
    return NO ;
  },

  /**
    Called from `createdRecords()` to created a single record.  This is the
    most basic primitive to can implement to support creating a record.

    To support cascading data stores, be sure to return `NO` if you cannot
    handle the passed storeKey or `YES` if you can.

    @param {SC.Store} store the requesting store
    @param {Array} storeKey key to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} YES if handled
  */
  createRecord: function(store, storeKey, params) {
    return NO ;
  },

  /**
    Called from `destroyRecords()` to destroy a single record.  This is the
    most basic primitive to can implement to support destroying a record.

    To support cascading data stores, be sure to return `NO` if you cannot
    handle the passed storeKey or `YES` if you can.

    @param {SC.Store} store the requesting store
    @param {Array} storeKey key to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} YES if handled
  */
  destroyRecord: function(store, storeKey, params) {
    return NO ;
  }

});
