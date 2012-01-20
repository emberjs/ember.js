var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var stateProperty = Ember.computed(function(key) {
  var parent = get(this, 'parentState');
  if (parent) {
    return get(parent, key);
  }
}).property();

DS.State = Ember.State.extend({
  isLoaded: stateProperty,
  isDirty: stateProperty,
  isSaving: stateProperty,
  isDeleted: stateProperty,
  isError: stateProperty,
  isNew: stateProperty,
  isValid: stateProperty
});

var cantLoadData = function() {
  // TODO: get the current state name
  throw "You cannot load data into the store when its associated model is in its current state";
};

var isEmptyObject = function(obj) {
  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop)) { continue; }
    return false;
  }

  return true;
};

var setProperty = function(manager, context) {
  var key = context.key, value = context.value;

  var model = get(manager, 'model'), type = model.constructor;
  var store = get(model, 'store');
  var data = get(model, 'data');

  data[key] = value;

  if (store) { store.hashWasUpdated(type, get(model, 'clientId')); }
};

// several states share extremely common functionality, so we are factoring
// them out into a common class.
var DirtyState = DS.State.extend({
  // these states are virtually identical except that
  // they (thrice) use their states name explicitly.
  //
  // child classes implement stateName.
  stateName: null,
  isDirty: true,
  willLoadData: cantLoadData,

  enter: function(manager) {
    var stateName = get(this, 'stateName'),
        model = get(manager, 'model');

    model.withTransaction(function (t) {
      t.modelBecameDirty(stateName, model);
    });
  },

  exit: function(manager) {
    var stateName = get(this, 'stateName'),
        model = get(manager, 'model');

    this.notifyModel(model);

    model.withTransaction(function (t) {
      t.modelBecameClean(stateName, model);
    });
  },

  setProperty: setProperty,

  willCommit: function(manager) {
    manager.goToState('saving');
  },

  saving: DS.State.extend({
    isSaving: true,

    didUpdate: function(manager) {
      manager.goToState('loaded');
    },

    wasInvalid: function(manager, errors) {
      var model = get(manager, 'model');

      set(model, 'errors', errors);
      manager.goToState('invalid');
    }
  }),

  invalid: DS.State.extend({
    isValid: false,

    setProperty: function(manager, context) {
      setProperty(manager, context);

      var stateName = getPath(this, 'parentState.stateName'),
          model = get(manager, 'model'),
          errors = get(model, 'errors'),
          key = context.key;

      delete errors[key];

      if (isEmptyObject(errors)) {
        manager.goToState(stateName);
      }
    }
  })
});

var states = {
  rootState: Ember.State.create({
    isLoaded: false,
    isDirty: false,
    isSaving: false,
    isDeleted: false,
    isError: false,
    isNew: false,
    isValid: true,

    willLoadData: cantLoadData,

    didCreate: function(manager) {
      manager.goToState('loaded.created');
    },

    empty: DS.State.create({
      loadingData: function(manager) {
        manager.goToState('loading');
      }
    }),

    loading: DS.State.create({
      willLoadData: Ember.K,

      exit: function(manager) {
        var model = get(manager, 'model');
        model.didLoad();
      },

      setData: function(manager, data) {
        var model = get(manager, 'model');

        model.beginPropertyChanges();
        model.set('data', data);

        if (data !== null) {
          manager.goToState('loaded');
        }

        model.endPropertyChanges();
      }
    }),

    loaded: DS.State.create({
      isLoaded: true,

      willLoadData: Ember.K,

      setProperty: function(manager, context) {
        setProperty(manager, context);
        manager.goToState('updated');
      },

      'delete': function(manager) {
        manager.goToState('deleted');
      },

      created: DirtyState.create({
        stateName: 'created',
        isNew: true,

        notifyModel: function(model) {
          model.didCreate();
        }
      }),

      updated: DirtyState.create({
        stateName: 'updated',

        notifyModel: function(model) {
          model.didUpdate();
        }
      })
    }),

    deleted: DS.State.create({
      isDeleted: true,
      isLoaded: true,
      isDirty: true,

      willLoadData: cantLoadData,

      enter: function(manager) {
        var model = get(manager, 'model');
        var store = get(model, 'store');

        if (store) {
          store.removeFromModelArrays(model);
        }

        model.withTransaction(function(t) {
          t.modelBecameDirty('deleted', model);
        });
      },

      willCommit: function(manager) {
        manager.goToState('saving');
      },

      saving: DS.State.create({
        isSaving: true,

        didDelete: function(manager) {
          manager.goToState('saved');
        },

        exit: function(stateManager) {
          var model = get(stateManager, 'model');

          model.withTransaction(function(t) {
            t.modelBecameClean('deleted', model);
          });
        }
      }),

      saved: DS.State.create({
        isDirty: false
      })
    }),

    error: DS.State.create({
      isError: true
    })
  })
};

DS.StateManager = Ember.StateManager.extend({
  model: null,
  initialState: 'rootState',
  states: states
});

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
  isValid: retrieveFromCurrentState,

  clientId: null,

  // because unknownProperty is used, any internal property
  // must be initialized here.
  primaryKey: 'id',
  data: null,
  transaction: null,

  didLoad: Ember.K,
  didUpdate: Ember.K,
  didCreate: Ember.K,

  init: function() {
    var stateManager = DS.StateManager.create({
      model: this
    });

    set(this, 'stateManager', stateManager);
    stateManager.goToState('empty');
  },

  withTransaction: function(fn) {
    var transaction = get(this, 'transaction') || getPath(this, 'store.defaultTransaction');

    if (transaction) { fn(transaction); }
  },

  setData: function(data) {
    var stateManager = get(this, 'stateManager');
    stateManager.send('setData', data);
  },

  setProperty: function(key, value) {
    var stateManager = get(this, 'stateManager');
    stateManager.send('setProperty', { key: key, value: value });
  },

  deleteRecord: function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('delete');
  },

  destroy: function() {
    this.deleteRecord();
    this._super();
  },

  loadingData: function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('loadingData');
  },

  willLoadData: function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('willLoadData');
  },

  willCommit: function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('willCommit');
  },

  adapterDidUpdate: function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('didUpdate');
  },

  adapterDidCreate: function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('didCreate');
  },

  adapterDidDelete: function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('didDelete');
  },

  wasInvalid: function(errors) {
    var stateManager = get(this, 'stateManager');
    stateManager.send('wasInvalid', errors);
  },

  unknownProperty: function(key) {
    var data = get(this, 'data');

    if (data) {
      return get(data, key);
    }
  },

  setUnknownProperty: function(key, value) {
    var data = get(this, 'data');
    ember_assert("You cannot set a model attribute before its data is loaded.", !!data);

    this.setProperty(key, value);
    return value;
  }
});

DS.attr = function(type, options) {
  var transform = DS.attr.transforms[type];
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

    if (typeof type === 'string') { type = getPath(this, type); }

    key = (options && options.key) ? options.key : key;
    if (one) {
      id = findRecord(store, type, data, key, true);
      association = id ? store.find(type, id) : null;
    } else {
      ids = findRecord(store, type, data, key);
      association = store.findMany(type, ids);
    }

    return association;
  }).property('data').cacheable();
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
