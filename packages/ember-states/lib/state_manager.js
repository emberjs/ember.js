var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

require('ember-states/state');

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

    var initialState = get(this, 'initialState');

    if (!initialState && getPath(this, 'states.start')) {
      initialState = 'start';
    }

    if (initialState) {
      this.goToState(initialState);
    }
  },

  currentState: null,

  /**
    @property

    If set to true, `errorOnUnhandledEvents` will cause an exception to be
    raised if you attempt to send an event to a state manager that is not
    handled by the current state or any of its parent states.
  */
  errorOnUnhandledEvent: true,

  /**
    @property

    If the current state is a view state or the descendent of a view state,
    this property will be the view associated with it. If there is no
    view state active in this state manager, this value will be null.
  */
  currentView: Ember.computed(function() {
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
    var log = this.enableLogging;

    var action = currentState[event];

    if (action) {
      if (log) { console.log(fmt("STATEMANAGER: Sending event '%@' to state %@.", [event, get(currentState, 'path')])); }
      action.call(currentState, this, context);
    } else {
      var parentState = get(currentState, 'parentState');
      if (parentState) {
        this.sendRecursively(event, parentState, context);
      } else if (get(this, 'errorOnUnhandledEvent')) {
        throw new Ember.Error(this.toString() + " could not respond to event " + event + " in state " + getPath(this, 'currentState.path') + ".");
      }
    }
  },

  findStatesByRoute: function(state, route) {
    if (!route || route === "") { return undefined; }
    var r = route.split('.'), ret = [];

    for (var i=0, len = r.length; i < len; i += 1) {
      var states = get(state, 'states') ;

      if (!states) { return undefined; }

      var s = get(states, r[i]);
      if (s) { state = s; ret.push(s); }
      else { return undefined; }
    }

    return ret;
  },

  goToState: function(name) {
    if (Ember.empty(name)) { return; }

    var currentState = get(this, 'currentState') || this, state, newState;

    var exitStates = [], enterStates;

    state = currentState;

    if (state.routes[name]) {
      // cache hit
      exitStates = state.routes[name].exitStates;
      enterStates = state.routes[name].enterStates;
      state = state.routes[name].futureState;
    } else {
      // cache miss

      newState = this.findStatesByRoute(currentState, name);

      while (state && !newState) {
        exitStates.unshift(state);

        state = get(state, 'parentState');
        if (!state) {
          newState = this.findStatesByRoute(this, name);
          if (!newState) { return; }
        }
        newState = this.findStatesByRoute(state, name);
      }

      enterStates = newState.slice(0);
      exitStates = exitStates.slice(0);

      if (enterStates.length > 0) {
        state = enterStates[enterStates.length - 1];

        while (enterStates.length > 0 && enterStates[0] === exitStates[0]) {
          enterStates.shift();
          exitStates.shift();
        }
      }

      currentState.routes[name] = {
        exitStates: exitStates,
        enterStates: enterStates,
        futureState: state
      };
    }

    this.enterState(exitStates, enterStates, state);
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

  enterState: function(exitStates, enterStates, state) {
    var log = this.enableLogging;

    var stateManager = this;

    exitStates = exitStates.slice(0).reverse();
    this.asyncEach(exitStates, function(state, transition) {
      state.exit(stateManager, transition);
    }, function() {
      this.asyncEach(enterStates, function(state, transition) {
        if (log) { console.log("STATEMANAGER: Entering " + get(state, 'path')); }
        state.enter(stateManager, transition);
      }, function() {
        var startState = state, enteredState, initialState;

        initialState = get(startState, 'initialState');

        if (!initialState) {
          initialState = 'start';
        }

        // right now, start states cannot be entered asynchronously
        while (startState = get(get(startState, 'states'), initialState)) {
          enteredState = startState;

          if (log) { console.log("STATEMANAGER: Entering " + get(startState, 'path')); }
          startState.enter(stateManager);

          initialState = get(startState, 'initialState');

          if (!initialState) {
            initialState = 'start';
          }
        }

        set(this, 'currentState', enteredState || state);
      });
    });
  }
});
