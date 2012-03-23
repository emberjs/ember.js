var get = Ember.get, set = Ember.set;

// This object is a regular JS object for performance. It is only
// used internally for bookkeeping purposes.
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
    var record = this.record;

    var unsavedData = this.unsavedData;
    var savedData = this.savedData();

    for (var prop in unsavedData) {
      if (unsavedData.hasOwnProperty(prop)) {
        savedData[prop] = unsavedData[prop];
        delete unsavedData[prop];
      }
    }

    record.notifyPropertyChange('data');
  },

  rollback: function() {
    this.unsavedData = {};
  },

  adapterDidUpdate: function(data) {
    this.unsavedData = {};
  }
};
