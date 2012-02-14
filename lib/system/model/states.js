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
  isPending: stateProperty,

  stateName: stateProperty
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

// The waitingOn event shares common functionality
// between the different dirty states, but each is
// treated slightly differently. This method is exposed
// so that each implementation can invoke the common
// behavior, and then implement the behavior specific
// to the state.
var waitingOn = function(manager, object) {
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
  initialState: 'unsaved',

  setProperty: setProperty,

  unsaved: DS.State.extend({
    enter: function(manager) {
      var stateName = get(this, 'stateName'),
          model = get(manager, 'model');

      model.withTransaction(function (t) {
        t.modelBecameDirty(stateName, model);
      });
    },

    exit: function(manager) {
      var model = get(manager, 'model');
      manager.send('notifyModel', model);
    },

    waitingOn: function(manager, object) {
      waitingOn(manager, object);
      manager.goToState('pending');
    },

    willCommit: function(manager) {
      manager.goToState('inFlight');
    }
  }),

  inFlight: DS.State.extend({
    // FLAGS
    isSaving: true,

    // TRANSITIONS
    enter: function(manager) {
      var stateName = get(this, 'stateName'),
          model = get(manager, 'model');

      model.withTransaction(function (t) {
        t.modelBecameClean(stateName, model);
      });
    },

    // ACTIONS
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

    start: DS.State.create({
      willCommit: function(manager) {
        manager.goToState('saving');
      },

      doneWaitingOn: function(manager, object) {
        var model = get(manager, 'model'),
            pendingQueue = get(model, 'pendingQueue'),
            objectGuid = guidFor(object);

        delete pendingQueue[objectGuid];

        if (isEmptyObject(pendingQueue)) {
          manager.goToState('unsaved');
        }
      }
    }),

    saving: DS.State.create({
      isSaving: true,

      doneWaitingOn: function(manager, object) {
        var model = get(manager, 'model'),
            pendingQueue = get(model, 'pendingQueue'),
            objectGuid = guidFor(object);

        delete pendingQueue[objectGuid];

        if (isEmptyObject(pendingQueue)) {
          manager.goToState('inFlight');
        }
      }
    })
  }),

  invalid: DS.State.extend({
    isValid: false,

    setProperty: function(manager, context) {
      setProperty(manager, context);

      var model = get(manager, 'model'),
          errors = get(model, 'errors'),
          key = context.key;

      delete errors[key];

      if (isEmptyObject(errors)) {
        manager.send('becameValid');
      }
    },

    becameValid: function(manager) {
      manager.goToState('unsaved');
    }
  })
});

var states = {
  rootState: Ember.State.create({
    // PROPERTIES
    isLoaded: false,
    isDirty: false,
    isSaving: false,
    isDeleted: false,
    isError: false,
    isNew: false,
    isValid: true,
    isPending: false,

    // ACTIONS
    willLoadData: cantLoadData,


    // SUBSTATES
    empty: DS.State.create({
      loadingData: function(manager) {
        manager.goToState('loading');
      },

      didCreate: function(manager) {
        manager.goToState('loaded.created');
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
          manager.send('loadedData');
        }

        model.endPropertyChanges();
      },

      loadedData: function(manager) {
        manager.goToState('loaded');
      }
    }),

    loaded: DS.State.create({
      initialState: 'saved',

      isLoaded: true,

      // ACTIONS
      willLoadData: Ember.K,

      setProperty: function(manager, context) {
        setProperty(manager, context);
        manager.goToState('updated');
      },

      'delete': function(manager) {
        manager.goToState('deleted');
      },

      // SUBSTATES
      saved: DS.State.create({
        waitingOn: function(manager, object) {
          waitingOn(manager, object);
          manager.goToState('updated.pending');
        }
      }),

      created: DirtyState.create({
        stateName: 'created',
        isNew: true,

        notifyModel: function(manager, model) {
          model.didCreate();
        }
      }),

      updated: DirtyState.create({
        stateName: 'updated',

        notifyModel: function(manager, model) {
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

      start: DS.State.create({
        willCommit: function(manager) {
          manager.goToState('saving');
        }
      }),

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
