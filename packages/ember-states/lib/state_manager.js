var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

require('ember-states/state');

Ember.LOG_STATE_TRANSITIONS = false;

/**
  @class
*/
Ember.StateManager = Ember.State.extend(
/** @scope Ember.State.prototype */ {

  /**
    TODO:
      add support for concurrent substates

    _cacheRecursively traverses a StateManager building a cache of all paths that
    can be reached via goToState.
  */
  _cacheRecursively: function(stateManager, path, state) {
    var cache = get(stateManager, '_cache'), name = get(state, 'name'), children = get(state, 'states'),
        prevStates = cache[path] || [];

    var key = (name) ? path + name : path;

    if (name) { 
      cache[key] = prevStates.slice();

      cache[key].push(state);
      set(state, '_path', key);
    } 

    if (children) {
      for (var name in children) {
        if (children.hasOwnProperty(name)) {
          var child = children[name];

          if (child.isState) { 
            stateManager._cacheRecursively(stateManager, key, child);
          }
        }
      }
    }
  },

  _clear: function() {
    this.set('_cache', {});
    this.set('currentStates', Ember.A());
  },
  
  /**
    When creating a new statemanager, look for a default state to transition
    into. This state can either be named `start`, or can be specified using the
    `initialState` property.
  */
  init: function() {
    this._super();

    this._clear();
    this._cacheRecursively(this, '', this);

    var initialState = get(this, 'initialState');

    if (!initialState && get(this, 'start')) {
      initialState = 'start';
    }

    // don't goTo initialState/start states for nested StateManagers
    if (initialState && !this.parentState) {
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
    var cache = get(this, '_cache');

    if (Ember.empty(name)) { return; }

    var currentState = get(this, 'currentState') || this,
        parentState = get(currentState, 'parentState') || this;

    var currentStatePath = get(currentState, '_path') || '',
        parentStatePath = get(parentState, '_path') || '';

    if (name[0] !== ".") { name = "." + name; }

    if (currentStatePath === name) { return; }

    var childPath = currentStatePath + name;
    var siblingPath = (parentState && get(parentState, '_path')) ? get(parentState, '_path') + name : name;

    // look up path as either child or sibling then finally via root
    var enterStates = (cache[childPath] || cache[siblingPath] || cache[name]) || [];
    var exitStates = cache[currentStatePath] || [];

    while (enterStates.length > 0 && enterStates[0] === exitStates[0]) {
      enterStates.shift();
      exitStates.shift();
    }

    if (enterStates.length > 0) {
      this.enterState(exitStates, enterStates);
    }
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

    if (!list.length || list.length == 0) {
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

  enterState: function(exitStates, enterStates) {
    var log = Ember.LOG_STATE_TRANSITIONS;

    var stateManager = this,
        state = enterStates[(enterStates.length - 1)];

    this.asyncEach(exitStates, function(state, transition) {
      state.exit(stateManager, transition);
    }, function() {
      this.asyncEach(enterStates, function(state, transition) {
        if (log) { console.log("STATEMANAGER: Entering " + state.name); }
        state.enter(stateManager, transition);
      }, function() {
        if (state) {
          var startState = state, enteredState;

          // right now, start states cannot be entered asynchronously
          while (startState = get(startState, 'start')) {
            enteredState = startState;
            startState.enter(stateManager);
          //  currentPaths.addObject(startState);
          }

          set(this, 'currentState', enteredState || state);
        }
      });
    });
  }
});
