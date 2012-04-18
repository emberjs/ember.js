/*globals Ember*/

require("ember-data/system/record_array");
require("ember-data/system/transaction");

var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

var DATA_PROXY = {
  get: function(name) {
    return this.savedData[name];
  }
};

// These values are used in the data cache when clientIds are
// needed but the underlying data has not yet been loaded by
// the server.
var UNLOADED = 'unloaded';
var LOADING = 'loading';

// Implementors Note:
//
//   The variables in this file are consistently named according to the following
//   scheme:
//
//   * +id+ means an identifier managed by an external source, provided inside the
//     data hash provided by that source.
//   * +clientId+ means a transient numerical identifier generated at runtime by
//     the data store. It is important primarily because newly created objects may
//     not yet have an externally generated id.
//   * +type+ means a subclass of DS.Model.

/**
  The store contains all of the hashes for records loaded from the server.
  It is also responsible for creating instances of DS.Model when you request one
  of these data hashes, so that they can be bound to in your Handlebars templates.

  Create a new store like this:

       MyApp.store = DS.Store.create();

  You can retrieve DS.Model instances from the store in several ways. To retrieve
  a record for a specific id, use the `find()` method:

       var record = MyApp.store.find(MyApp.Contact, 123);

   By default, the store will talk to your backend using a standard REST mechanism.
   You can customize how the store talks to your backend by specifying a custom adapter:

       MyApp.store = DS.Store.create({
         adapter: 'MyApp.CustomAdapter'
       });

    You can learn more about writing a custom adapter by reading the `DS.Adapter`
    documentation.
*/
DS.Store = Ember.Object.extend({

  /**
    Many methods can be invoked without specifying which store should be used.
    In those cases, the first store created will be used as the default. If
    an application has multiple stores, it should specify which store to use
    when performing actions, such as finding records by id.

    The init method registers this store as the default if none is specified.
  */
  init: function() {
    // Enforce API revisioning. See BREAKING_CHANGES.md for more.
    var revision = get(this, 'revision');

    if (revision !== DS.CURRENT_API_REVISION && !Ember.ENV.TESTING) {
      throw new Error("Error: The Ember Data library has had breaking API changes since the last time you updated the library. Please review the list of breaking changes at https://github.com/emberjs/data/blob/master/BREAKING_CHANGES.md, then update your store's `revision` property to " + DS.CURRENT_API_REVISION);
    }

    if (!get(DS, 'defaultStore') || get(this, 'isDefaultStore')) {
      set(DS, 'defaultStore', this);
    }

    // internal bookkeeping; not observable
    this.typeMaps = {};
    this.recordCache = [];
    this.clientIdToId = {};
    this.recordArraysByClientId = {};

    set(this, 'defaultTransaction', this.transaction());

    return this._super();
  },

  /**
    Returns a new transaction scoped to this store.

    @see {DS.Transaction}
    @returns DS.Transaction
  */
  transaction: function() {
    return DS.Transaction.create({ store: this });
  },

  /**
    @private

    This is used only by the record's DataProxy. Do not use this directly.
  */
  dataForRecord: function(record) {
    var type = record.constructor,
        clientId = get(record, 'clientId'),
        typeMap = this.typeMapFor(type);

    return typeMap.cidToHash[clientId];
  },

  /**
    The adapter to use to communicate to a backend server or other persistence layer.

    This can be specified as an instance, a class, or a property path that specifies
    where the adapter can be located.

    @property {DS.Adapter|String}
  */
  adapter: null,

  /**
    @private

    This property returns the adapter, after resolving a possible String.

    @returns DS.Adapter
  */
  _adapter: Ember.computed(function() {
    var adapter = get(this, 'adapter');
    if (typeof adapter === 'string') {
      return getPath(this, adapter, false) || getPath(window, adapter);
    }
    return adapter;
  }).property('adapter').cacheable(),

  // A monotonically increasing number to be used to uniquely identify
  // data hashes and records.
  clientIdCounter: 1,

  // .....................
  // . CREATE NEW RECORD .
  // .....................

  /**
    Create a new record in the current store. The properties passed
    to this method are set on the newly created record.

    @param {subclass of DS.Model} type
    @param {Object} properties a hash of properties to set on the
      newly created record.
    @returns DS.Model
  */
  createRecord: function(type, properties, transaction) {
    properties = properties || {};

    // Create a new instance of the model `type` and put it
    // into the specified `transaction`. If no transaction is
    // specified, the default transaction will be used.
    //
    // NOTE: A `transaction` is specified when the
    // `transaction.createRecord` API is used.
    var record = type._create({
      store: this
    });

    transaction = transaction || get(this, 'defaultTransaction');
    transaction.adoptRecord(record);

    // Extract the primary key from the `properties` hash,
    // based on the `primaryKey` for the model type.
    var primaryKey = get(record, 'primaryKey'),
        id = properties[primaryKey] || null;

    // If the passed properties do not include a primary key,
    // give the adapter an opportunity to generate one.
    var adapter;
    if (Ember.none(id)) {
      adapter = get(this, 'adapter');
      if (adapter && adapter.generateIdForRecord) {
        id = adapter.generateIdForRecord(this, record);
        properties.id = id;
      }
    }

    var hash = {}, clientId;

    // Push the hash into the store. If present, associate the
    // extracted `id` with the hash.
    clientId = this.pushHash(hash, id, type);

    record.send('didChangeData');

    var recordCache = get(this, 'recordCache');

    // Now that we have a clientId, attach it to the record we
    // just created.
    set(record, 'clientId', clientId);

    // Store the record we just created in the record cache for
    // this clientId.
    recordCache[clientId] = record;

    // Set the properties specified on the record.
    record.setProperties(properties);

    this.updateRecordArrays(type, clientId, get(record, 'data'));

    return record;
  },

  // .................
  // . DELETE RECORD .
  // .................

  /**
    For symmetry, a record can be deleted via the store.

    @param {DS.Model} record
  */
  deleteRecord: function(record) {
    record.send('deleteRecord');
  },

  // ................
  // . FIND RECORDS .
  // ................

  /**
    This is the main entry point into finding records. The first
    parameter to this method is always a subclass of `DS.Model`.

    You can use the `find` method on a subclass of `DS.Model`
    directly if your application only has one store. For
    example, instead of `store.find(App.Person, 1)`, you could
    say `App.Person.find(1)`.

    ---

    To find a record by ID, pass the `id` as the second parameter:

        store.find(App.Person, 1);
        App.Person.find(1);

    If the record with that `id` had not previously been loaded,
    the store will return an empty record immediately and ask
    the adapter to find the data by calling the adapter's `find`
    method.

    The `find` method will always return the same object for a
    given type and `id`. To check whether the adapter has populated
    a record, you can check its `isLoaded` property.

    ---

    To find all records for a type, call `find` with no additional
    parameters:

        store.find(App.Person);
        App.Person.find();

    This will return a `RecordArray` representing all known records
    for the given type and kick off a request to the adapter's
    `findAll` method to load any additional records for the type.

    The `RecordArray` returned by `find()` is live. If any more
    records for the type are added at a later time through any
    mechanism, it will automatically update to reflect the change.

    ---

    To find a record by a query, call `find` with a hash as the
    second parameter:

        store.find(App.Person, { page: 1 });
        App.Person.find({ page: 1 });

    This will return a `RecordArray` immediately, but it will always
    be an empty `RecordArray` at first. It will call the adapter's
    `findQuery` method, which will populate the `RecordArray` once
    the server has returned results.

    You can check whether a query results `RecordArray` has loaded
    by checking its `isLoaded` property.
  */
  find: function(type, id, query) {
    if (id === undefined) {
      return this.findAll(type);
    }

    if (query !== undefined) {
      return this.findMany(type, id, query);
    } else if (Ember.typeOf(id) === 'object') {
      return this.findQuery(type, id);
    }

    if (Ember.isArray(id)) {
      return this.findMany(type, id);
    }

    var clientId = this.typeMapFor(type).idToCid[id];

    return this.findByClientId(type, clientId, id);
  },

  findByClientId: function(type, clientId, id) {
    var recordCache = get(this, 'recordCache'),
        dataCache = this.typeMapFor(type).cidToHash,
        record;

    // If there is already a clientId assigned for this
    // type/id combination, try to find an existing
    // record for that id and return. Otherwise,
    // materialize a new record and set its data to the
    // value we already have.
    if (clientId !== undefined) {
      record = recordCache[clientId];

      if (!record) {
        // create a new instance of the model type in the
        // 'isLoading' state
        record = this.materializeRecord(type, clientId);

        if (typeof dataCache[clientId] === 'object') {
          record.send('didChangeData');
        }
      }
    } else {
      clientId = this.pushHash(LOADING, id, type);

      // create a new instance of the model type in the
      // 'isLoading' state
      record = this.materializeRecord(type, clientId);

      // let the adapter set the data, possibly async
      var adapter = get(this, '_adapter');
      if (adapter && adapter.find) { adapter.find(this, type, id); }
      else { throw fmt("Adapter is either null or does not implement `find` method", this); }
    }

    return record;
  },

  /**
    @private

    Ask the adapter to fetch IDs that are not already loaded.

    This method will convert `id`s to `clientId`s, filter out
    `clientId`s that already have a data hash present, and pass
    the remaining `id`s to the adapter.

    @param {Class} type A model class
    @param {Array} ids An array of ids
    @param {Object} query

    @returns {Array} An Array of all clientIds for the
      specified ids.
  */
  fetchMany: function(type, ids, query) {
    var typeMap = this.typeMapFor(type),
        idToClientIdMap = typeMap.idToCid,
        dataCache = typeMap.cidToHash,
        data = typeMap.cidToHash,
        needed;

    var clientIds = Ember.A([]);

    if (ids) {
      needed = [];

      ids.forEach(function(id) {
        // Get the clientId for the given id
        var clientId = idToClientIdMap[id];

        // If there is no `clientId` yet
        if (clientId === undefined) {
          // Create a new `clientId`, marking its data hash
          // as loading. Once the adapter returns the data
          // hash, it will be updated
          clientId = this.pushHash(LOADING, id, type);
          needed.push(id);

        // If there is a clientId, but its data hash is
        // marked as unloaded (this happens when a
        // hasMany association creates clientIds for its
        // referenced ids before they were loaded)
        } else if (clientId && data[clientId] === UNLOADED) {
          // change the data hash marker to loading
          dataCache[clientId] = LOADING;
          needed.push(id);
        }

        // this method is expected to return a list of
        // all of the clientIds for the specified ids,
        // unconditionally add it.
        clientIds.push(clientId);
      }, this);
    } else {
      needed = null;
    }

    // If there are any needed ids, ask the adapter to load them
    if ((needed && get(needed, 'length') > 0) || query) {
      var adapter = get(this, '_adapter');
      if (adapter && adapter.findMany) { adapter.findMany(this, type, needed, query); }
      else { throw fmt("Adapter is either null or does not implement `findMany` method", this); }
    }

    return clientIds;
  },

  /** @private
  */
  findMany: function(type, ids, query) {
    var clientIds = this.fetchMany(type, ids, query);

    return this.createManyArray(type, clientIds);
  },

  findQuery: function(type, query) {
    var array = DS.AdapterPopulatedRecordArray.create({ type: type, content: Ember.A([]), store: this });
    var adapter = get(this, '_adapter');
    if (adapter && adapter.findQuery) { adapter.findQuery(this, type, query, array); }
    else { throw fmt("Adapter is either null or does not implement `findQuery` method", this); }
    return array;
  },

  findAll: function(type) {

    var typeMap = this.typeMapFor(type),
        findAllCache = typeMap.findAllCache;

    if (findAllCache) { return findAllCache; }

    var array = DS.RecordArray.create({ type: type, content: Ember.A([]), store: this });
    this.registerRecordArray(array, type);

    var adapter = get(this, '_adapter');
    if (adapter && adapter.findAll) { adapter.findAll(this, type); }

    typeMap.findAllCache = array;
    return array;
  },

  filter: function(type, query, filter) {
    // allow an optional server query
    if (arguments.length === 3) {
      this.findQuery(type, query);
    } else if (arguments.length === 2) {
      filter = query;
    }

    var array = DS.FilteredRecordArray.create({ type: type, content: Ember.A([]), store: this, filterFunction: filter });

    this.registerRecordArray(array, type, filter);

    return array;
  },

  // ............
  // . UPDATING .
  // ............

  hashWasUpdated: function(type, clientId, record) {
    // Because hash updates are invoked at the end of the run loop,
    // it is possible that a record might be deleted after its hash
    // has been modified and this method was scheduled to be called.
    //
    // If that's the case, the record would have already been removed
    // from all record arrays; calling updateRecordArrays would just
    // add it back. If the record is deleted, just bail. It shouldn't
    // give us any more trouble after this.

    if (get(record, 'isDeleted')) { return; }
    this.updateRecordArrays(type, clientId, get(record, 'data'));
  },

  // ..............
  // . PERSISTING .
  // ..............

  commit: function() {
    var defaultTransaction = get(this, 'defaultTransaction');
    set(this, 'defaultTransaction', this.transaction());

    defaultTransaction.commit();
  },

  didUpdateRecords: function(array, hashes) {
    if (hashes) {
      array.forEach(function(record, idx) {
        this.didUpdateRecord(record, hashes[idx]);
      }, this);
    } else {
      array.forEach(function(record) {
        this.didUpdateRecord(record);
      }, this);
    }
  },

  didUpdateRecord: function(record, hash) {
    if (hash) {
      var clientId = get(record, 'clientId'),
          dataCache = this.typeMapFor(record.constructor).cidToHash;

      dataCache[clientId] = hash;
      record.send('didChangeData');
      record.hashWasUpdated();
    }

    record.send('didCommit');
  },

  didDeleteRecords: function(array) {
    array.forEach(function(record) {
      record.send('didCommit');
    });
  },

  didDeleteRecord: function(record) {
    record.send('didCommit');
  },

  _didCreateRecord: function(record, hash, typeMap, clientId, primaryKey) {
    var recordData = get(record, 'data'), id, changes;

    if (hash) {
      typeMap.cidToHash[clientId] = hash;

      // If the server returns a hash, we assume that the server's version
      // of the data supercedes the local changes.
      record.beginPropertyChanges();
      record.send('didChangeData');
      recordData.adapterDidUpdate(hash);
      record.hashWasUpdated();
      record.endPropertyChanges();

      id = hash[primaryKey];

      typeMap.idToCid[id] = clientId;
      this.clientIdToId[clientId] = id;
    } else {
      recordData.commit();
    }

    record.send('didCommit');
  },


  didCreateRecords: function(type, array, hashes) {
    var primaryKey = type.proto().primaryKey,
        typeMap = this.typeMapFor(type),
        clientId;

    for (var i=0, l=get(array, 'length'); i<l; i++) {
      var record = array[i], hash = hashes[i];
      clientId = get(record, 'clientId');

      this._didCreateRecord(record, hash, typeMap, clientId, primaryKey);
    }
  },

  didCreateRecord: function(record, hash) {
    var type = record.constructor,
        typeMap = this.typeMapFor(type),
        clientId, primaryKey;

    // The hash is optional, but if it is not provided, the client must have
    // provided a primary key.

    primaryKey = type.proto().primaryKey;

    // TODO: Make ember_assert more flexible and convert this into an ember_assert
    if (hash) {
      ember_assert("The server must provide a primary key: " + primaryKey, get(hash, primaryKey));
    } else {
      ember_assert("The server did not return data, and you did not create a primary key (" + primaryKey + ") on the client", get(get(record, 'data'), primaryKey));
    }

    clientId = get(record, 'clientId');

    this._didCreateRecord(record, hash, typeMap, clientId, primaryKey);
  },

  recordWasInvalid: function(record, errors) {
    record.send('becameInvalid', errors);
  },

  // .................
  // . RECORD ARRAYS .
  // .................

  registerRecordArray: function(array, type, filter) {
    var recordArrays = this.typeMapFor(type).recordArrays;

    recordArrays.push(array);

    this.updateRecordArrayFilter(array, type, filter);
  },

  createManyArray: function(type, clientIds) {
    var array = DS.ManyArray.create({ type: type, content: clientIds, store: this });

    clientIds.forEach(function(clientId) {
      var recordArrays = this.recordArraysForClientId(clientId);
      recordArrays.add(array);
    }, this);

    return array;
  },

  updateRecordArrayFilter: function(array, type, filter) {
    var typeMap = this.typeMapFor(type),
        dataCache = typeMap.cidToHash,
        clientIds = typeMap.clientIds,
        clientId, hash, proxy;

    var recordCache = get(this, 'recordCache'), record;

    for (var i=0, l=clientIds.length; i<l; i++) {
      clientId = clientIds[i];

      hash = dataCache[clientId];
      if (typeof hash === 'object') {
        if (record = recordCache[clientId]) {
          proxy = get(record, 'data');
        } else {
          DATA_PROXY.savedData = hash;
          proxy = DATA_PROXY;
        }

        this.updateRecordArray(array, filter, type, clientId, proxy);
      }
    }
  },

  updateRecordArrays: function(type, clientId, dataProxy) {
    var recordArrays = this.typeMapFor(type).recordArrays,
        filter;

    recordArrays.forEach(function(array) {
      filter = get(array, 'filterFunction');
      this.updateRecordArray(array, filter, type, clientId, dataProxy);
    }, this);
  },

  updateRecordArray: function(array, filter, type, clientId, dataProxy) {
    var shouldBeInArray;

    if (!filter) {
      shouldBeInArray = true;
    } else {
      shouldBeInArray = filter(dataProxy);
    }

    var content = get(array, 'content');
    var alreadyInArray = content.indexOf(clientId) !== -1;

    var recordArrays = this.recordArraysForClientId(clientId);

    if (shouldBeInArray && !alreadyInArray) {
      recordArrays.add(array);
      content.pushObject(clientId);
    } else if (!shouldBeInArray && alreadyInArray) {
      recordArrays.remove(array);
      content.removeObject(clientId);
    }
  },

  removeFromRecordArrays: function(record) {
    var clientId = get(record, 'clientId');
    var recordArrays = this.recordArraysForClientId(clientId);

    recordArrays.forEach(function(array) {
      var content = get(array, 'content');
      content.removeObject(clientId);
    });
  },

  // ............
  // . INDEXING .
  // ............

  recordArraysForClientId: function(clientId) {
    var recordArrays = get(this, 'recordArraysByClientId');
    var ret = recordArrays[clientId];

    if (!ret) {
      ret = recordArrays[clientId] = Ember.OrderedSet.create();
    }

    return ret;
  },

  typeMapFor: function(type) {
    var typeMaps = get(this, 'typeMaps');
    var guidForType = Ember.guidFor(type);

    var typeMap = typeMaps[guidForType];

    if (typeMap) {
      return typeMap;
    } else {
      return (typeMaps[guidForType] =
        {
          idToCid: {},
          clientIds: [],
          cidToHash: {},
          recordArrays: []
      });
    }
  },

  /** @private

    For a given type and id combination, returns the client id used by the store.
    If no client id has been assigned yet, one will be created and returned.

    @param {DS.Model} type
    @param {String|Number} id
  */
  clientIdForId: function(type, id) {
    var clientId = this.typeMapFor(type).idToCid[id];

    if (clientId !== undefined) { return clientId; }

    return this.pushHash(UNLOADED, id, type);
  },

  // ................
  // . LOADING DATA .
  // ................

  /**
    Load a new data hash into the store for a given id and type combination.
    If data for that record had been loaded previously, the new information
    overwrites the old.

    If the record you are loading data for has outstanding changes that have not
    yet been saved, an exception will be thrown.

    @param {DS.Model} type
    @param {String|Number} id
    @param {Object} hash the data hash to load
  */
  load: function(type, id, hash) {
    if (hash === undefined) {
      hash = id;
      var primaryKey = type.proto().primaryKey;
      ember_assert("A data hash was loaded for a record of type " + type.toString() + " but no primary key '" + primaryKey + "' was provided.", primaryKey in hash);
      id = hash[primaryKey];
    }

    var typeMap = this.typeMapFor(type),
        dataCache = typeMap.cidToHash,
        clientId = typeMap.idToCid[id],
        recordCache = get(this, 'recordCache');

    if (clientId !== undefined) {
      dataCache[clientId] = hash;

      var record = recordCache[clientId];
      if (record) {
        record.send('didChangeData');
      }
    } else {
      clientId = this.pushHash(hash, id, type);
    }

    DATA_PROXY.savedData = hash;
    this.updateRecordArrays(type, clientId, DATA_PROXY);

    return { id: id, clientId: clientId };
  },

  loadMany: function(type, ids, hashes) {
    var clientIds = Ember.A([]);

    if (hashes === undefined) {
      hashes = ids;
      ids = [];
      var primaryKey = type.proto().primaryKey;

      ids = Ember.ArrayUtils.map(hashes, function(hash) {
        return hash[primaryKey];
      });
    }

    for (var i=0, l=get(ids, 'length'); i<l; i++) {
      var loaded = this.load(type, ids[i], hashes[i]);
      clientIds.pushObject(loaded.clientId);
    }

    return { clientIds: clientIds, ids: ids };
  },

  /** @private

    Stores a data hash for the specified type and id combination and returns
    the client id.

    @param {Object} hash
    @param {String|Number} id
    @param {DS.Model} type
    @returns {Number}
  */
  pushHash: function(hash, id, type) {
    var typeMap = this.typeMapFor(type);

    var idToClientIdMap = typeMap.idToCid,
        clientIdToIdMap = this.clientIdToId,
        clientIds = typeMap.clientIds,
        dataCache = typeMap.cidToHash;

    var clientId = ++this.clientIdCounter;

    dataCache[clientId] = hash;

    // if we're creating an item, this process will be done
    // later, once the object has been persisted.
    if (id) {
      idToClientIdMap[id] = clientId;
      clientIdToIdMap[clientId] = id;
    }

    clientIds.push(clientId);

    return clientId;
  },

  // ..........................
  // . RECORD MATERIALIZATION .
  // ..........................

  materializeRecord: function(type, clientId) {
    var record;

    get(this, 'recordCache')[clientId] = record = type._create({
      store: this,
      clientId: clientId
    });

    get(this, 'defaultTransaction').adoptRecord(record);

    record.send('loadingData');
    return record;
  },

  destroy: function() {
    if (get(DS, 'defaultStore') === this) {
      set(DS, 'defaultStore', null);
    }

    return this._super();
  }
});
