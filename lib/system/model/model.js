require("ember-data/system/model/states");

var get = Ember.get, set = Ember.set, getPath = Ember.getPath, none = Ember.none;

var retrieveFromCurrentState = Ember.computed(function(key) {
  return get(getPath(this, 'stateManager.currentState'), key);
}).property('stateManager.currentState').cacheable();

// This object is a regular JS object for performance. It is only
// used internally for bookkeeping purposes.
var DataProxy = function(record) {
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
  stateManager: null,
  pendingQueue: null,
  errors: null,

  // because unknownProperty is used, any internal property
  // must be initialized here.
  primaryKey: 'id',
  id: Ember.computed(function(key, value) {
    var primaryKey = get(this, 'primaryKey'),
        data = get(this, 'data');

    if (arguments.length === 2) {
      set(data, primaryKey, value);
      return value;
    }

    return data && get(data, primaryKey);
  }).property('primaryKey', 'data'),

  // The following methods are callbacks invoked by `getJSON`. You
  // can override one of the callbacks to override specific behavior,
  // or getJSON itself.
  //
  // If you override getJSON, you can invoke these callbacks manually
  // to get the default behavior.

  /**
    Add the record's primary key to the JSON hash.

    The default implementation uses the record's specified `primaryKey`
    and the `id` computed property, which are passed in as parameters.

    @param {Object} json the JSON hash being built
    @param {Number|String} id the record's id
    @param {String} key the primaryKey for the record
  */
  addIdToJSON: function(json, id, key) {
    if (id) { json[key] = id; }
  },

  /**
    Add the attributes' current values to the JSON hash.

    The default implementation gets the current value of each
    attribute from the `data`, and uses a `defaultValue` if
    specified in the `DS.attr` definition.

    @param {Object} json the JSON hash being build
    @param {Ember.Map} attributes a Map of attributes
    @param {DataProxy} data the record's data, accessed with `get` and `set`.
  */
  addAttributesToJSON: function(json, attributes, data) {
    attributes.forEach(function(name, meta) {
      var key = meta.key(this.constructor),
          value = get(data, key);

      if (value === undefined) {
        value = meta.options.defaultValue;
      }

      json[key] = value;
    }, this);
  },

  /**
    Add the value of a `hasMany` association to the JSON hash.

    The default implementation honors the `embedded` option
    passed to `DS.hasMany`. If embedded, `toJSON` is recursively
    called on the child records. If not, the `id` of each
    record is added.

    Note that if a record is not embedded and does not
    yet have an `id` (usually provided by the server), it
    will not be included in the output.

    @param {Object} json the JSON hash being built
    @param {DataProxy} data the record's data, accessed with `get` and `set`.
    @param {Object} meta information about the association
    @param {Object} options options passed to `toJSON`
  */
  addHasManyToJSON: function(json, data, meta, options) {
    var key = meta.key,
        manyArray = get(this, key),
        records = [],
        clientId, id;

    if (meta.options.embedded) {
      // TODO: Avoid materializing embedded hashes if possible
      manyArray.forEach(function(record) {
        records.push(record.toJSON(options));
      });
    } else {
      var clientIds = get(manyArray, 'content');

      for (var i=0, l=clientIds.length; i<l; i++) {
        clientId = clientIds[i];
        id = get(this, 'store').clientIdToId[clientId];

        if (id !== undefined) {
          records.push(id);
        }
      }
    }

    json[key] = records;
  },

  /**
    Add the value of a `belongsTo` association to the JSON hash.

    The default implementation always includes the `id`.

    @param {Object} json the JSON hash being built
    @param {DataProxy} data the record's data, accessed with `get` and `set`.
    @param {Object} meta information about the association
    @param {Object} options options passed to `toJSON`
  */
  addBelongsToToJSON: function(json, data, meta, options) {
    var key = meta.key, value, id;

    if (options.embedded) {
      key = options.key || get(this, 'namingConvention').keyToJSONKey(key);
      value = get(data.record, key);
      json[key] = value ? value.toJSON(options) : null;
    } else {
      key = options.key || get(this, 'namingConvention').foreignKey(key);
      id = data.get(key);
      json[key] = none(id) ? null : id;
    }
  },
  /**
    Create a JSON representation of the record, including its `id`,
    attributes and associations. Honor any settings defined on the
    attributes or associations (such as `embedded` or `key`).
  */
  toJSON: function(options) {
    var data = get(this, 'data'),
        result = {},
        type = this.constructor,
        attributes = get(type, 'attributes'),
        primaryKey = get(this, 'primaryKey'),
        id = get(this, 'id'),
        store = get(this, 'store'),
        associations;

    options = options || {};

    // delegate to `addIdToJSON` callback
    this.addIdToJSON(result, id, primaryKey);

    // delegate to `addAttributesToJSON` callback
    this.addAttributesToJSON(result, attributes, data);

    associations = get(type, 'associationsByName');

    // add associations, delegating to `addHasManyToJSON` and
    // `addBelongsToToJSON`.
    associations.forEach(function(key, meta) {
      if (options.associations && meta.kind === 'hasMany') {
        this.addHasManyToJSON(result, data, meta, options);
      } else if (meta.kind === 'belongsTo') {
        this.addBelongsToToJSON(result, data, meta, options);
      }
    }, this);

    return result;
  },

  data: Ember.computed(function() {
    return new DataProxy(this);
  }).cacheable(),

  didLoad: Ember.K,
  didUpdate: Ember.K,
  didCreate: Ember.K,

  init: function() {
    var stateManager = DS.StateManager.create({
      model: this
    });

    set(this, 'pendingQueue', {});

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
    var data = get(this, 'data');

    if (data && key in data) {
      ember_assert("You attempted to access the " + key + " property on a model without defining an attribute.", false);
    }
  },

  setUnknownProperty: function(key, value) {
    var data = get(this, 'data');

    if (data && key in data) {
      ember_assert("You attempted to set the " + key + " property on a model without defining an attribute.", false);
    } else {
      return this._super(key, value);
    }
  },

  namingConvention: {
    keyToJSONKey: function(key) {
      // TODO: Strip off `is` from the front. Example: `isHipster` becomes `hipster`
      return Ember.String.decamelize(key);
    },

    foreignKey: function(key) {
      return Ember.String.decamelize(key) + '_id';
    }
  },

  /** @private */
  hashWasUpdated: function() {
    // At the end of the run loop, notify model arrays that
    // this record has changed so they can re-evaluate its contents
    // to determine membership.
    Ember.run.once(this, this.notifyHashWasUpdated);
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
