var get = Ember.get, set = Ember.set;

/**
  @class

  @extends Ember.Object
*/
Ember.State = Ember.Object.extend(Ember.Evented,
/** @scope Ember.State.prototype */{
  isState: true,

  /**
    A reference to the parent state.

    @type Ember.State
  */
  parentState: null,
  start: null,

  /**
    The name of this state.

    @type String
  */
  name: null,

  /**
    The full path to this state.

    @type String
    @readOnly
  */
  path: Ember.computed(function() {
    var parentPath = get(this, 'parentState.path'),
        path = get(this, 'name');

    if (parentPath) {
      path = parentPath + '.' + path;
    }

    return path;
  }).property().cacheable(),

  /**
    @private

    Override the default event firing from Ember.Evented to
    also call methods with the given name.
  */
  trigger: function(name) {
    if (this[name]) {
      this[name].apply(this, [].slice.call(arguments, 1));
    }
    this._super.apply(this, arguments);
  },

  /** @private */
  init: function() {
    var states = get(this, 'states'), foundStates;
    set(this, 'childStates', Ember.A());
    set(this, 'eventTransitions', get(this, 'eventTransitions') || {});

    var name, value, transitionTarget;

    // As a convenience, loop over the properties
    // of this state and look for any that are other
    // Ember.State instances or classes, and move them
    // to the `states` hash. This avoids having to
    // create an explicit separate hash.

    if (!states) {
      states = {};

      for (name in this) {
        if (name === "constructor") { continue; }

        if (value = this[name]) {
          if (transitionTarget = value.transitionTarget) {
            this.eventTransitions[name] = transitionTarget;
          }

          this.setupChild(states, name, value);
        }
      }

      set(this, 'states', states);
    } else {
      for (name in states) {
        this.setupChild(states, name, states[name]);
      }
    }

    set(this, 'pathsCache', {});
    set(this, 'pathsCacheNoContext', {});
  },

  /** @private */
  setupChild: function(states, name, value) {
    if (!value) { return false; }

    if (value.isState) {
      set(value, 'name', name);
    } else if (Ember.State.detect(value)) {
      value = value.create({
        name: name
      });
    }

    if (value.isState) {
      set(value, 'parentState', this);
      get(this, 'childStates').pushObject(value);
      states[name] = value;
    }
  },

  lookupEventTransition: function(name) {
    var path, state = this;

    while(state && !path) {
      path = state.eventTransitions[name];
      state = state.get('parentState');
    }

    return path;
  },

  /**
    A Boolean value indicating whether the state is a leaf state
    in the state hierarchy. This is false if the state has child
    states; otherwise it is true.

    @type Boolean
  */
  isLeaf: Ember.computed(function() {
    return !get(this, 'childStates').length;
  }).cacheable(),

  /**
    A boolean value indicating whether the state takes a context.
    By default we assume all states take contexts.
  */
  hasContext: true,

  /**
    This is the default transition event.

    @event
    @param {Ember.StateManager} manager
    @param context
    @see Ember.StateManager#transitionEvent
  */
  setup: Ember.K,

  /**
    This event fires when the state is entered.

    @event
    @param {Ember.StateManager} manager
  */
  enter: Ember.K,

  /**
    This event fires when the state is exited.

    @event
    @param {Ember.StateManager} manager
  */
  exit: Ember.K
});

var Event = Ember.$ && Ember.$.Event;

Ember.State.reopenClass(
/** @scope Ember.State */{

  /**
  @static

  Creates an action function for transitioning to the named state while preserving
  context or multiple contexts

  The following example StateManagers are equivalent:

      aManager = Ember.StateManager.create({
        stateOne: Ember.State.create({
          changeToStateTwo: Ember.State.transitionTo('stateTwo')
        }),
        stateTwo: Ember.State.create({})
      })

      bManager = Ember.StateManager.create({
        stateOne: Ember.State.create({
          changeToStateTwo: function(manager, context){
            manager.transitionTo('stateTwo', context)
          }
        }),
        stateTwo: Ember.State.create({})
      })

  @param {String} target
  */
  transitionTo: function(target) {
    var event = function(stateManager, context) {
      var contexts;
      
      // if the transition is the result of user interaction
      // the context is a jQuery event with both
      // context and contexts properties. We need to extact these.
      if (Event && context instanceof Event) {
        if (context.hasOwnProperty('contexts')) { contexts = context.contexts; }
        if (context.hasOwnProperty('context'))  { context = context.context;   }
      }
      
      
      // if context itself has a length, then it is 'contexts'
      // and it's first item is context.
      if (context && context.length) {
        contexts = context;
        context  = contexts[0];
      }
      
      // if there is no context, don't pass along a 
      // superfluous context to the target of the event
      // and we can return the transitionTo call on the manager.
      if (!context) { return stateManager.transitionTo(target); }
      
      
      // if we have multiple contexts we need to turn them
      // into arguments passed to the transition
      if (contexts && contexts.length) {
        contexts.unshift(target);
        stateManager.transitionTo.apply(stateManager, contexts);
      } else {
        // otherwise pass the context on
        stateManager.transitionTo(target, context);
      }
    };

    event.transitionTarget = target;

    return event;
  }
});
