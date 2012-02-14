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

// Implementation notes:
//
// Each state has a boolean value for all of the following flags:
//
// * isLoaded: The record has a populated `data` property. When a
//   record is loaded via `store.find`, `isLoaded` is false
//   until the adapter sets it. When a record is created locally,
//   its `isLoaded` property is always true.
// * isDirty: The record has local changes that have not yet been
//   saved by the adapter. This includes records that have been
//   created (but not yet saved) or deleted.
// * isSaving: The record's transaction has been committed, but
//   the adapter has not yet acknowledged that the changes have
//   been persisted to the backend.
// * isDeleted: The record was marked for deletion. When `isDeleted`
//   is true and `isDirty` is true, the record is deleted locally
//   but the deletion was not yet persisted. When `isSaving` is
//   true, the change is in-flight. When both `isDirty` and
//   `isSaving` are false, the change has persisted.
// * isError: The adapter reported that it was unable to save
//   local changes to the backend. This may also result in the
//   record having its `isValid` property become false if the
//   adapter reported that server-side validations failed.
// * isNew: The record was created on the client and the adapter
//   did not yet report that it was successfully saved.
// * isValid: No client-side validations have failed and the
//   adapter did not report any server-side validation failures.
// * isPending: A record `isPending` when it belongs to an
//   association on another record and that record has not been
//   saved. A record in this state cannot be saved because it
//   lacks a "foreign key" that will be supplied by its parent
//   association when the parent record has been created. When
//   the adapter reports that the parent has saved, the
//   `isPending` property on all children will become `false`
//   and the transaction will try to commit the records.


// The dirty state is a abstract state whose functionality is
// shared between the `created` and `updated` states.
//
// The deleted state shares the `isDirty` flag with the
// subclasses of `DirtyState`, but with a very different
// implementation.
var DirtyState = DS.State.extend({
  stateName: null,
  initialState: 'unsaved',

  // FLAGS
  isDirty: true,

  // EVENTS
  setProperty: setProperty,

  // SUBSTATES

  // When a record first becomes dirty, it is `unsaved`.
  // This means that there are local pending changes,
  // but they have not yet begun to be saved.
  unsaved: DS.State.extend({
    // TRANSITIONS
    enter: function(manager) {
      var stateName = get(this, 'stateName'),
          model = get(manager, 'model');

      model.withTransaction(function (t) {
        t.modelBecameDirty(stateName, model);
      });
    },

    exit: function(manager) {
      var model = get(manager, 'model');
      manager.send('invokeLifecycleCallbacks', model);
    },

    // EVENTS
    waitingOn: function(manager, object) {
      waitingOn(manager, object);
      manager.goToState('pending');
    },

    willCommit: function(manager) {
      manager.goToState('inFlight');
    }
  }),

  // Once a record has been handed off to the adapter to be
  // saved, it is in the 'in flight' state. Changes to the
  // record cannot be made during this window.
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

    // EVENTS
    didCommit: function(manager) {
      manager.goToState('loaded');
    },

    wasInvalid: function(manager, errors) {
      var model = get(manager, 'model');

      set(model, 'errors', errors);
      manager.goToState('invalid');
    },

    setData: function(manager, hash) {
      var model = get(manager, 'model');
      set(model, 'data', hash);
    }
  }),

  // If a record becomes associated with a newly created
  // parent record, it will be `pending` until the parent
  // record has successfully persisted. Once this happens,
  // this record can use the parent's primary key as its
  // foreign key.
  //
  // If the record's transaction had already started to
  // commit, the record will transition to the `inFlight`
  // state. If it had not, the record will transition to
  // the `unsaved` state.
  pending: DS.State.extend({
    // FLAGS
    isPending: true,

    // SUBSTATES

    // A pending record whose transaction has not yet
    // started to commit is in this state.
    start: DS.State.create({
      // EVENTS
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

    // A pending record whose transaction has started
    // to commit is in this state.
    saving: DS.State.create({
      // FLAGS
      isSaving: true,

      // EVENTS
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

  // A record is in the `invalid` state when its client-side
  // invalidations have failed, or if the adapter has indicated
  // the the record failed server-side invalidations.
  invalid: DS.State.extend({
    // FLAGS
    isValid: false,

    // EVENTS
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
    // FLAGS
    isLoaded: false,
    isDirty: false,
    isSaving: false,
    isDeleted: false,
    isError: false,
    isNew: false,
    isValid: true,
    isPending: false,

    // SUBSTATES

    // A record begins its lifecycle in the `empty` state.
    // If its data will come from the adapter, it will
    // transition into the `loading` state. Otherwise, if
    // the record is being created on the client, it will
    // transition into the `created` state.
    empty: DS.State.create({
      // EVENTS
      loadingData: function(manager) {
        manager.goToState('loading');
      },

      setData: function(manager, hash) {
        var model = get(manager, 'model');
        set(model, 'data', hash);
        manager.goToState('loaded.created');
      }
    }),

    // A record enters this state when the store askes
    // the adapter for its data. It remains in this state
    // until the adapter provides the requested data.
    //
    // Usually, this process is asynchronous, using an
    // XHR to retrieve the data.
    loading: DS.State.create({
      // TRANSITIONS
      exit: function(manager) {
        var model = get(manager, 'model');
        model.didLoad();
      },

      // EVENTS
      waitingOn: cantWaitOn("loading"),

      setData: function(manager, data) {
        var model = get(manager, 'model');

        model.beginPropertyChanges();
        set(model, 'data', data);

        if (data !== null) {
          manager.send('loadedData');
        }

        model.endPropertyChanges();
      },

      loadedData: function(manager) {
        manager.goToState('loaded');
      }
    }),

    // A record enters this state when its data is populated.
    // Most of a record's lifecycle is spent inside substates
    // of the `loaded` state.
    loaded: DS.State.create({
      initialState: 'saved',

      // FLAGS
      isLoaded: true,

      // EVENTS
      setProperty: function(manager, context) {
        setProperty(manager, context);
        manager.goToState('updated');
      },

      deleteRecord: function(manager) {
        manager.goToState('deleted');
      },

      // SUBSTATES

      // If there are no local changes to a record, it remains
      // in the `saved` state.
      saved: DS.State.create({
        waitingOn: function(manager, object) {
          waitingOn(manager, object);
          manager.goToState('updated.pending');
        }
      }),

      // A record is in this state after it has been locally
      // created but before the adapter has indicated that
      // it has been saved.
      created: DirtyState.create({
        stateName: 'created',

        // FLAGS
        isNew: true,

        // EVENTS
        invokeLifecycleCallbacks: function(manager, model) {
          model.didCreate();
        }
      }),

      // A record is in this state if it has already been
      // saved to the server, but there are new local changes
      // that have not yet been saved.
      updated: DirtyState.create({
        stateName: 'updated',

        // EVENTS
        invokeLifecycleCallbacks: function(manager, model) {
          model.didUpdate();
        }
      })
    }),

    // A record is in this state if it was deleted from the store.
    deleted: DS.State.create({
      // FLAGS
      isDeleted: true,
      isLoaded: true,
      isDirty: true,

      // TRANSITIONS
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

      // SUBSTATES

      // When a record is deleted, it enters the `start`
      // state. It will exit this state when the record's
      // transaction starts to commit.
      start: DS.State.create({
        willCommit: function(manager) {
          manager.goToState('saving');
        }
      }),

      // After a record's transaction is committing, but
      // before the adapter indicates that the deletion
      // has saved to the server, a record is in the
      // `saving` substate of `deleted`.
      saving: DS.State.create({
        // FLAGS
        isSaving: true,

        // TRANSITIONS
        exit: function(stateManager) {
          var model = get(stateManager, 'model');

          model.withTransaction(function(t) {
            t.modelBecameClean('deleted', model);
          });
        },

        // EVENTS
        didCommit: function(manager) {
          manager.goToState('saved');
        }
      }),

      // Once the adapter indicates that the deletion has
      // been saved, the record enters the `saved` substate
      // of `deleted`.
      saved: DS.State.create({
        isDirty: false
      })
    }),

    // If the adapter indicates that there was an unknown
    // error saving a record, the record enters the `error`
    // state.
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
