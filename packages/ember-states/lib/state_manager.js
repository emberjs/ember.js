var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

require('ember-states/state');

Ember.LOG_STATE_TRANSITIONS = false;

/**
  @class
*/
Ember.StateManager = Ember.State.extend(
/** @scope Ember.State.prototype */ {

  /**
    When creating a new statemanager, look for a default state to transition
    into. This state can either be named `start`, or can be specified using the
    `initialState` property.
  */
  init: function() {
    this._super();

    var states = get(this, 'states');
    if (!states) {
      states = {};
      Ember.keys(this).forEach(function(name) {
        var value = get(this, name);

        if (value && value.isState) {
          states[name] = value;
        }
      }, this);

      set(this, 'states', states);
    }

    var initialState = get(this, 'initialState');

    if (!initialState && get(this, 'start')) {
      initialState = 'start';
    }

    if (initialState) {
      this.goToState(initialState);
    }
  },

  currentState: null,

  /**
    @property

    If the current state is a view state or the descendent of a view state,
    this property will be the view associated with it. If there is no
    view state active in this state manager, this value will be null.
  */
  currentView: SC.computed(function() {
    var currentState = get(this, 'currentState'),
        view;

    while (currentState) {
      if (get(currentState, 'isViewState')) {
        view = get(currentState, 'view');
        if (view) { return view; }
      }

      currentState = get(currentState, 'parentState');
    }

    return null;
  }).property('currentState').cacheable(),

  send: function(event, context) {
    this.sendRecursively(event, get(this, 'currentState'), context);
  },

  sendRecursively: function(event, currentState, context) {
    var log = Ember.LOG_STATE_TRANSITIONS;

    var action = currentState[event];

    if (action) {
      if (log) { console.log(fmt("STATEMANAGER: Sending event '%@' to state %@.", [event, currentState.name])); }
      action.call(currentState, this, context);
    } else {
      var parentState = get(currentState, 'parentState');
      if (parentState) { this.sendRecursively(event, parentState, context); }
    }
  },

  goToState: function(name) {
    if (Ember.empty(name)) { return; }

    var currentState = get(this, 'currentState') || this, state, newState;

    var exitStates = Ember.A();

    newState = getPath(currentState, name);
    state = currentState;

    if (!newState) {
      while (state && !newState) {
        exitStates[Ember.guidFor(state)] = state;
        exitStates.push(state);

        state = get(state, 'parentState');
        if (!state) {
          state = get(this, 'states');
          newState = getPath(state, name);
          if (!newState) { return; }
        }
        newState = getPath(state, name);
      }
    }

    this.enterState(state, name, exitStates);
  },

  getState: function(name) {
    var state = get(this, name),
        parentState = get(this, 'parentState');

    if (state) {
      return state;
    } else if (parentState) {
      return parentState.getState(name);
    }
  },

  asyncEach: function(list, callback, doneCallback) {
    var async = false, self = this;

    if (!list.length) {
      if (doneCallback) { doneCallback.call(this); }
      return;
    }

    var head = list[0];
    var tail = list.slice(1);

    var transition = {
      async: function() { async = true; },
      resume: function() {
        self.asyncEach(tail, callback, doneCallback);
      }
    };

    callback.call(this, head, transition);

    if (!async) { transition.resume(); }
  },

  enterState: function(parent, name, exitStates) {
    var log = Ember.LOG_STATE_TRANSITIONS;

    var parts = name.split("."), state = parent, enterStates = Ember.A();

    parts.forEach(function(name) {
      state = state[name];

      var guid = Ember.guidFor(state);

      if (guid in exitStates) {
        exitStates.removeObject(state);
        delete exitStates[guid];
      } else {
        enterStates.push(state);
      }
    });

    var stateManager = this;

    this.asyncEach(exitStates, function(state, transition) {
      state.exit(stateManager, transition);
    }, function() {
      this.asyncEach(enterStates, function(state, transition) {
        if (log) { console.log("STATEMANAGER: Entering " + state.name); }
        state.enter(stateManager, transition);
      }, function() {
        var startState = state, enteredState, initialSubstate;

        initialSubstate = get(startState, 'initialSubstate');

        if (!initialSubstate) {
          initialSubstate = 'start';
        }

        // right now, start states cannot be entered asynchronously
        while (startState = get(startState, initialSubstate)) {
          enteredState = startState;
          startState.enter(stateManager);
        }

        set(this, 'currentState', enteredState || state);
      });
    });
  }
});
