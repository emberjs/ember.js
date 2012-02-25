require("ember-data/system/model/states");

var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var retrieveFromCurrentState = Ember.computed(function(key) {
  return get(getPath(this, 'stateManager.currentState'), key);
}).property('stateManager.currentState').cacheable();

var DataProxy = function(record) { this.record = record; };

DataProxy.prototype = {
  get: function(key) { return Ember.get(this, key); },
  set: function(key, value) { return Ember.set(this, key, value); },

  unknownProperty: function(key) {
    var unsavedData = get(this.record, 'unsavedData'),
        savedData = get(this.record, 'savedData');

    var value = unsavedData[key];

    if (savedData && value === undefined) {
      value = savedData[key];
    }

    return value;
  },

  setUnknownProperty: function(key, value) {
    var record = this.record,
        unsavedData = get(this.record, 'unsavedData');

    unsavedData[key] = value;

    // At the end of the run loop, notify model arrays that
    // this record has changed so they can re-evaluate its contents
    // to determine membership.
    Ember.run.once(record, record.notifyHashWasUpdated);

    return value;
  },

  commit: function() {
    var record = this.record;

    var unsavedData = get(record, 'unsavedData');
    var savedData = get(record, 'savedData');

    for (var prop in unsavedData) {
      if (unsavedData.hasOwnProperty(prop)) {
        savedData[prop] = unsavedData[prop];
        delete unsavedData[prop];
      }
    }

    record.notifyPropertyChange('savedData');
    record.notifyPropertyChange('unsavedData');
  },

  rollback: function() {
    set(this.record, 'unsavedData', {});
  },

  adapterDidUpdate: function(data) {
    var record = this.record;

    set(record, 'unsavedData', {});
    record.send('setData', data);
  }
};

DS.Model = Ember.Object.extend({
  isLoaded: retrieveFromCurrentState,
  isDirty: retrieveFromCurrentState,
  isSaving: retrieveFromCurrentState,
  isDeleted: retrieveFromCurrentState,
  isError: retrieveFromCurrentState,
  isNew: retrieveFromCurrentState,
  isPending: retrieveFromCurrentState,
  isValid: retrieveFromCurrentState,

  clientId: null,
  transaction: null,

  // because unknownProperty is used, any internal property
  // must be initialized here.
  primaryKey: 'id',
  id: Ember.computed(function(key, value) {
    var primaryKey = get(this, 'primaryKey'),
        data = get(this, 'savedData');

    if (arguments.length === 2) {
      set(data, primaryKey, value);
      return value;
    }

    return data && get(data, primaryKey);
  }).property('primaryKey', 'savedData'),

  toJSON: function() {
    var data = get(this, 'data'),
        result = {},
        type = this.constructor,
        attributes = get(type, 'attributes'),
        associations = get(type, 'associationsByName');

    attributes.forEach(function(name, meta) {
      var key = meta.key || name;

      result[key] = get(data, key);
    }, this);

    return result;
  },

  data: Ember.computed(function() {
    return new DataProxy(this);
  }).cacheable(),

  savedData: null,
  unsavedData: null,

  pendingQueue: null,

  errors: null,

  didLoad: Ember.K,
  didUpdate: Ember.K,
  didCreate: Ember.K,

  init: function() {
    var stateManager = DS.StateManager.create({
      model: this
    });

    set(this, 'pendingQueue', {});
    set(this, 'unsavedData', {});

    set(this, 'stateManager', stateManager);
    stateManager.goToState('empty');
  },

  destroy: function() {
    if (!get(this, 'isDeleted')) {
      this.deleteRecord();
    }
    this._super();
  },

  send: function(name, context) {
    return get(this, 'stateManager').send(name, context);
  },

  withTransaction: function(fn) {
    var transaction = get(this, 'transaction');
    if (transaction) { fn(transaction); }
  },

  setProperty: function(key, value) {
    this.send('setProperty', { key: key, value: value });
  },

  deleteRecord: function() {
    this.send('deleteRecord');
  },

  waitingOn: function(record) {
    this.send('waitingOn', record);
  },

  notifyHashWasUpdated: function() {
    var store = get(this, 'store');
    if (store) {
      store.hashWasUpdated(this.constructor, get(this, 'clientId'), this);
    }
  },

  unknownProperty: function(key) {
    var data = get(this, 'savedData');

    if (data && key in data) {
      ember_assert("You attempted to access the " + key + " property on a model without defining an attribute.", false);
    }
  },

  setUnknownProperty: function(key, value) {
    var data = get(this, 'savedData');

    if (data && key in data) {
      ember_assert("You attempted to set the " + key + " property on a model without defining an attribute.", false);
    } else {
      return this._super(key, value);
    }
  }
});

// Helper function to generate store aliases.
// This returns a function that invokes the named alias
// on the default store, but injects the class as the
// first parameter.
var storeAlias = function(methodName) {
  return function() {
    var store = get(DS, 'defaultStore'),
        args = [].slice.call(arguments);

    args.unshift(this);
    return store[methodName].apply(store, args);
  };
};

DS.Model.reopenClass({
  find: storeAlias('find'),
  filter: storeAlias('filter'),

  _create: DS.Model.create,

  create: function() {
    throw new Ember.Error("You should not call `create` on a model. Instead, call `createRecord` with the attributes you would like to set.");
  },

  createRecord: storeAlias('createRecord')
});
