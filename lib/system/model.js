var get = SC.get, set = SC.set, getPath = SC.getPath;

var stateProperty = SC.computed(function(key) {
  var parent = get(this, 'parentState');
  if (parent) {
    return get(parent, key);
  }
}).property();

DS.State = SC.State.extend({
  isLoaded: stateProperty,
  isDirty: stateProperty,
  isSaving: stateProperty,
  isDeleted: stateProperty,
  isError: stateProperty,
  isNew: stateProperty
});

var cantLoadData = function() {
  // TODO: get the current state name
  throw "You cannot load data into the store when its associated model is in its current state";
};

var states = {
  rootState: SC.State.create({
    isLoaded: false,
    isDirty: false,
    isSaving: false,
    isDeleted: false,
    isError: false,
    isNew: false,

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
      willLoadData: SC.K,

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

      willLoadData: SC.K,

      setProperty: function(manager, context) {
        var key = context.key, value = context.value;

        var model = get(manager, 'model'), type = model.constructor;
        var store = get(model, 'store');
        var data = get(model, 'data');

        data[key] = value;

        if (store) { store.hashWasUpdated(type, get(model, 'clientId')); }

        manager.goToState('updated');
      },

      'delete': function(manager) {
        manager.goToState('deleted');
      },

      created: DS.State.create({
        isNew: true,
        isDirty: true,

        enter: function(manager) {
          var model = get(manager, 'model');
          var store = get(model, 'store');

          if (store) { store.modelBecameDirty('created', model); }
        },

        willCommit: function(manager) {
          manager.goToState('saving');
        },

        saving: DS.State.create({
          isSaving: true,

          exit: function(manager) {
            var model = get(manager, 'model');
            var store = get(model, 'store');

            model.didCreate();

            if (store) { store.modelBecameClean('created', model); }
          },

          didUpdate: function(manager) {
            manager.goToState('loaded');
          }
        })
      }),

      updated: DS.State.create({
        isDirty: true,

        willLoadData: cantLoadData,

        enter: function(manager) {
          var model = get(manager, 'model');
          var store = get(model, 'store');

          if (store) { store.modelBecameDirty('updated', model); }
        },

        willCommit: function(manager) {
          manager.goToState('saving');
        },

        saving: DS.State.create({
          isSaving: true,

          exit: function(manager) {
            var model = get(manager, 'model');
            var store = get(model, 'store');

            model.didUpdate();

            if (store) { store.modelBecameClean('updated', model); }
          },

          didUpdate: function(manager) {
            manager.goToState('loaded');
          }
        }),
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
          store.modelBecameDirty('deleted', model);
        }
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
          var store = get(model, 'store');

          store.modelBecameClean('deleted', model);
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

var retrieveFromCurrentState = SC.computed(function(key) {
  return get(getPath(this, 'stateManager.currentState'), key);
}).property('stateManager.currentState').cacheable();

DS.Model = SC.Object.extend({
  isLoaded: retrieveFromCurrentState,
  isDirty: retrieveFromCurrentState,
  isSaving: retrieveFromCurrentState,
  isDeleted: retrieveFromCurrentState,
  isError: retrieveFromCurrentState,
  isNew: retrieveFromCurrentState,

  clientId: null,

  primaryKey: 'id',
  data: null,

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

  setData: function(data) {
    var stateManager = get(this, 'stateManager');
    stateManager.send('setData', data);
  },

  setProperty: function(key, value) {
    var stateManager = get(this, 'stateManager');
    stateManager.send('setProperty', { key: key, value: value });
  },

  "deleteModel": function() {
    var stateManager = get(this, 'stateManager');
    stateManager.send('delete');
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

  return SC.computed(function(key, value) {
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

var embeddedFindMany = function(store, type, data, key) {
  var association = data ? get(data, key) : [];
  return store.loadMany(type, association).ids;
};

var referencedFindMany = function(store, type, data, key) {
  return data ? get(data, key) : [];
};

DS.hasMany = function(type, options) {
  var embedded = options && options.embedded, load;

  findMany = embedded ? embeddedFindMany : referencedFindMany;

  return SC.computed(function(key) {
    var data = get(this, 'data'), ids;
    var store = get(this, 'store');

    ids = findMany(store, type, data, key);
    var hasMany = store.findMany(type, ids);

    SC.addObserver(this, 'data', function() {
      var data = get(this, 'data');

      var ids = findMany(store, type, data, key);
      store.findMany(type, ids);

      var idToClientIdMap = store.idToClientIdMap(type);

      var clientIds = ids.map(function(id) {
        return idToClientIdMap[id];
      });

      set(hasMany, 'content', Ember.A(clientIds));
    });

    return hasMany;
  }).property().cacheable();
};

DS.attr.transforms = {
  string: {
    from: function(serialized) {
      return String(serialized);
    },

    to: function(deserialized) {
      return String(deserialized);
    }
  },

  integer: {
    from: function(serialized) {
      return Number(serialized);
    },

    to: function(deserialized) {
      return Number(deserialized);
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
      return new Date(serialized);
    },

    to: function(deserialized) {
      return deserialized.toString();
    }
  }
};
