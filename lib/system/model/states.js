var get = Ember.get, set = Ember.set, getPath = Ember.getPath, guidFor = Ember.guidFor;

var stateProperty = Ember.computed(function(key) {
  var parent = get(this, 'parentState');
  if (parent) {
    return get(parent, key);
  }
}).property();

var isEmptyObject = function(object) {
  for (var name in obj) {
    if (obj.hasOwnProperty(name)) { return false; }
  }

  return true;
};

DS.State = Ember.State.extend({
  isLoaded: stateProperty,
  isDirty: stateProperty,
  isSaving: stateProperty,
  isDeleted: stateProperty,
  isError: stateProperty,
  isNew: stateProperty,
  isValid: stateProperty,
  isPending: stateProperty
});

var cantLoadData = function() {
  // TODO: get the current state name
  throw "You cannot load data into the store when its associated model is in its current state";
};

var cantWaitOn = function(state) {
  return function() {
    throw "You cannot insert an object into an association while it is " + state;
  };
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

  start: DS.State.extend(),

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

  pending: DS.State.extend({
    isPending: true,

    doneWaitingOn: function(manager, object) {
      var model = get(manager, 'model'),
          pendingQueue = get(model, 'pendingQueue'),
          objectGuid = guidFor(object);

      delete pendingQueue[objectGuid];

      if (isEmptyObject(pendingQueue)) {
        manager.goToState('start');
      }
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
    isPending: false,

    willLoadData: cantLoadData,

    waitingOn: function(manager, object) {
      var model = get(manager, 'model'),
          pendingQueue = get(model, 'pendingQueue'),
          objectGuid = guidFor(object);

      pendingQueue[objectGuid] = true;

      var observer = function() {
        if (get(object, 'isLoaded')) {
          manager.send('doneWaitingOn', object);
          Ember.removeObserver(object, 'isLoaded', observer);
        }
      };

      Ember.addObserver(object, 'isLoaded', observer);
    },

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
      waitingOn: cantWaitOn("loading"),

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

      waitingOn: function(manager, object) {
        // bubble up this event
        manager.sendRecursively('waitingOn', get(this, 'parentState'), object);
        manager.goToState('updated.pending');
      },

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

        waitingOn: function(manager, object) {
          // bubble up this event
          manager.sendRecursively('waitingOn', get(this, 'parentState'), object);
          manager.goToState('created.pending');
        },

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
