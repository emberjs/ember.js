var get = Ember.get, set = Ember.set;

//  When a record is changed on the client, it is considered "dirty"--there are
//  pending changes that need to be saved to a persistence layer, such as a
//  server.
//
//  If the record is rolled back, it re-enters a clean state, any changes are
//  discarded, and its attributes are reset back to the last known good copy
//  of the data that came from the server.
//
//  If the record is committed, the changes are sent to the server to be saved,
//  and once the server confirms that they are valid, the record's "canonical"
//  data becomes the original canonical data plus the changes merged in.
//
//  A DataProxy is an object that encapsulates this change tracking. It
//  contains three buckets:
//
//  * `savedData` - the last-known copy of the data from the server
//  * `unsavedData` - a hash that contains any changes that have not yet
//     been committed
//  * `associations` - this is similar to `savedData`, but holds the client
//    ids of associated records
//
//  When setting a property on the object, the value is placed into the
//  `unsavedData` bucket:
//
//      proxy.set('key', 'value');
//
//      // unsavedData:
//      {
//        key: "value"
//      }
//
//  When retrieving a property from the object, it first looks to see
//  if that value exists in the `unsavedData` bucket, and returns it if so.
//  Otherwise, it returns the value from the `savedData` bucket.
//
//  When the adapter notifies a record that it has been saved, it merges the
//  `unsavedData` bucket into the `savedData` bucket. If the record's
//  transaction is rolled back, the `unsavedData` hash is simply discarded.
//
//  This object is a regular JS object for performance. It is only
//  used internally for bookkeeping purposes.

var DataProxy = DS._DataProxy = function(record) {
  this.record = record;

  this.unsavedData = {};

  this.associations = {};
};

DataProxy.prototype = {
  get: function(key) { return Ember.get(this, key); },
  set: function(key, value) { return Ember.set(this, key, value); },

  setAssociation: function(key, value) {
    this.associations[key] = value;
  },

  savedData: function() {
    var savedData = this._savedData;
    if (savedData) { return savedData; }

    var record = this.record,
        clientId = get(record, 'clientId'),
        store = get(record, 'store');

    if (store) {
      savedData = store.dataForRecord(record);
      this._savedData = savedData;
      return savedData;
    }
  },

  unknownProperty: function(key) {
    var unsavedData = this.unsavedData,
        associations = this.associations,
        savedData = this.savedData(),
        store;

    var value = unsavedData[key], association;

    // if this is a belongsTo association, this will
    // be a clientId.
    association = associations[key];

    if (association !== undefined) {
      store = get(this.record, 'store');
      return store.clientIdToId[association];
    }

    if (savedData && value === undefined) {
      value = savedData[key];
    }

    return value;
  },

  setUnknownProperty: function(key, value) {
    var record = this.record,
        unsavedData = this.unsavedData;

    unsavedData[key] = value;

    record.hashWasUpdated();

    return value;
  },

  commit: function() {
    this.saveData();

    this.record.notifyPropertyChange('data');
  },

  rollback: function() {
    this.unsavedData = {};

    this.record.notifyPropertyChange('data');
  },

  saveData: function() {
    var record = this.record;

    var unsavedData = this.unsavedData;
    var savedData = this.savedData();

    for (var prop in unsavedData) {
      if (unsavedData.hasOwnProperty(prop)) {
        savedData[prop] = unsavedData[prop];
        delete unsavedData[prop];
      }
    }
  },

  adapterDidUpdate: function() {
    this.unsavedData = {};
  }
};
