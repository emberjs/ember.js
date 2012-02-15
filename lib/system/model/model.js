require("ember-data/system/model/states");

var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var retrieveFromCurrentState = Ember.computed(function(key) {
  return get(getPath(this, 'stateManager.currentState'), key);
}).property('stateManager.currentState').cacheable();

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

  // because unknownProperty is used, any internal property
  // must be initialized here.
  primaryKey: 'id',
  id: Ember.computed(function() {
    var primaryKey = get(this, 'primaryKey'),
        data = get(this, 'data');

    return data && get(data, primaryKey);
  }).property('primaryKey', 'data'),

  data: null,
  pendingQueue: null,
  transaction: null,
  errors: null,

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
    this.deleteRecord();
    this._super();
  },

  send: function(name, context) {
    return get(this, 'stateManager').send(name, context);
  },

  withTransaction: function(fn) {
    var transaction = get(this, 'transaction') || getPath(this, 'store.defaultTransaction');
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
  }
});

DS.Model.reopenClass({
  typeForAssociation: function(association) {
    var type = this.metaForProperty(association).type;
    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }
    return type;
  }
});

DS.attr = function(type, options) {
  var transform = DS.attr.transforms[type];
  ember_assert("Could not find model attribute of type " + type, !!transform);

  var transformFrom = transform.from;
  var transformTo = transform.to;

  return Ember.computed(function(key, value) {
    var data = get(this, 'data');

    key = (options && options.key) ? options.key : key;

    if (value === undefined) {
      if (!data) { return; }

      return transformFrom(data[key]);
    } else {
      ember_assert("You cannot set a model attribute before its data is loaded.", !!data);

      value = transformTo(value);
      this.setProperty(key, value);
      return value;
    }
  }).property('data');
};

var embeddedFindRecord = function(store, type, data, key, one) {
  var association = data ? get(data, key) : one ? null : [];
  if (one) {
    return association ? store.load(type, association).id : null;
  } else {
    return association ? store.loadMany(type, association).ids : [];
  }
};

var referencedFindRecord = function(store, type, data, key, one) {
  return data ? get(data, key) : one ? null : [];
};

var hasAssociation = function(type, options, one) {
  var embedded = options && options.embedded,
    findRecord = embedded ? embeddedFindRecord : referencedFindRecord;

  return Ember.computed(function(key) {
    var data = get(this, 'data'), ids, id, association,
      store = get(this, 'store');

    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }

    key = (options && options.key) ? options.key : key;
    if (one) {
      id = findRecord(store, type, data, key, true);
      association = id ? store.find(type, id) : null;
    } else {
      ids = findRecord(store, type, data, key);
      association = store.findMany(type, ids);
    }

    return association;
  }).property('data').cacheable().meta({ type: type });
};

DS.hasMany = function(type, options) {
  ember_assert("The type passed to DS.hasMany must be defined", !!type);
  return hasAssociation(type, options);
};

DS.hasOne = function(type, options) {
  ember_assert("The type passed to DS.hasOne must be defined", !!type);
  return hasAssociation(type, options, true);
};

DS.attr.transforms = {
  string: {
    from: function(serialized) {
      return Em.none(serialized) ? null : String(serialized);
    },

    to: function(deserialized) {
      return Em.none(deserialized) ? null : String(deserialized);
    }
  },

  integer: {
    from: function(serialized) {
      return Em.none(serialized) ? null : Number(serialized);
    },

    to: function(deserialized) {
      return Em.none(deserialized) ? null : Number(deserialized);
    }
  },

  boolean: {
    from: function(serialized) {
      return Boolean(serialized);
    },

    to: function(deserialized) {
      return Boolean(deserialized);
    }
  },

  date: {
    from: function(serialized) {
      var type = typeof serialized;

      if (type === "string" || type === "number") {
        return new Date(serialized);
      } else if (serialized === null || serialized === undefined) {
        // if the value is not present in the data,
        // return undefined, not null.
        return serialized;
      } else {
        return null;
      }
    },

    to: function(date) {
      if (date instanceof Date) {
        var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        var pad = function(num) {
          return num < 10 ? "0"+num : ""+num;
        };

        var utcYear = date.getUTCFullYear(),
            utcMonth = date.getUTCMonth(),
            utcDayOfMonth = date.getUTCDate(),
            utcDay = date.getUTCDay(),
            utcHours = date.getUTCHours(),
            utcMinutes = date.getUTCMinutes(),
            utcSeconds = date.getUTCSeconds();


        var dayOfWeek = days[utcDay];
        var dayOfMonth = pad(utcDayOfMonth);
        var month = months[utcMonth];

        return dayOfWeek + ", " + dayOfMonth + " " + month + " " + utcYear + " " +
               pad(utcHours) + ":" + pad(utcMinutes) + ":" + pad(utcSeconds) + " GMT";
      } else if (date === undefined) {
        return undefined;
      } else {
        return null;
      }
    }
  }
};

