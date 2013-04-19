var get = Ember.get, set = Ember.set;

/**
@module ember
@submodule ember-states
*/

/**
  @class State
  @namespace Ember
  @extends Ember.Object
  @uses Ember.Evented
*/
Ember.State = Ember.Object.extend(Ember.Evented,
/** @scope Ember.State.prototype */{
  isState: true,

  /**
    A reference to the parent state.

    @property parentState
    @type Ember.State
  */
  parentState: null,
  start: null,

  /**
    The name of this state.

    @property name
    @type String
  */
  name: null,

  /**
    The full path to this state.

    @property path
    @type String
  */
  path: Ember.computed(function() {
    var parentPath = get(this, 'parentState.path'),
        path = get(this, 'name');

    if (parentPath) {
      path = parentPath + '.' + path;
    }

    return path;
  }),

  /**
    @private

    Override the default event firing from `Ember.Evented` to
    also call methods with the given name.

    @method trigger
    @param name
  */
  trigger: function(name) {
    if (this[name]) {
      this[name].apply(this, [].slice.call(arguments, 1));
    }
    this._super.apply(this, arguments);
  },

  init: function() {
    var states = get(this, 'states');
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

    // pathsCaches is a nested hash of the form:
    //   pathsCaches[stateManagerTypeGuid][path] == transitions_hash
    set(this, 'pathsCaches', {});
  },

  setPathsCache: function(stateManager, path, transitions) {
    var stateManagerTypeGuid = Ember.guidFor(stateManager.constructor),
      pathsCaches = get(this, 'pathsCaches'),
      pathsCacheForManager = pathsCaches[stateManagerTypeGuid] || {};

    pathsCacheForManager[path] = transitions;
    pathsCaches[stateManagerTypeGuid] = pathsCacheForManager;
  },

  getPathsCache: function(stateManager, path) {
    var stateManagerTypeGuid = Ember.guidFor(stateManager.constructor),
      pathsCaches = get(this, 'pathsCaches'),
      pathsCacheForManager = pathsCaches[stateManagerTypeGuid] || {};

    return pathsCacheForManager[path];
  },

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
      return value;
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
    in the state hierarchy. This is `false` if the state has child
    states; otherwise it is true.

    @property isLeaf
    @type Boolean
  */
  isLeaf: Ember.computed(function() {
    return !get(this, 'childStates').length;
  }),

  /**
    A boolean value indicating whether the state takes a context.
    By default we assume all states take contexts.

    @property hasContext
    @default true
  */
  hasContext: true,

  /**
    This is the default transition event.

    @event setup
    @param {Ember.StateManager} manager
    @param context
    @see Ember.StateManager#transitionEvent
  */
  setup: Ember.K,

  /**
    This event fires when the state is entered.

    @event enter
    @param {Ember.StateManager} manager
  */
  enter: Ember.K,

  /**
    This event fires when the state is exited.

    @event exit
    @param {Ember.StateManager} manager
  */
  exit: Ember.K
});

Ember.State.reopenClass({

  /**
    Creates an action function for transitioning to the named state while
    preserving context.

    The following example StateManagers are equivalent:

    ```javascript
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
    ```

    @method transitionTo
    @static
    @param {String} target
  */

  transitionTo: function(target) {

    var transitionFunction = function(stateManager, contextOrEvent) {
      var contexts = [],
          Event = Ember.$ && Ember.$.Event;

      if (contextOrEvent && (Event && contextOrEvent instanceof Event)) {
        if (contextOrEvent.hasOwnProperty('contexts')) {
          contexts = contextOrEvent.contexts.slice();
        }
      }
      else {
        contexts = [].slice.call(arguments, 1);
      }

      contexts.unshift(target);
      stateManager.transitionTo.apply(stateManager, contexts);
    };

    transitionFunction.transitionTarget = target;

    return transitionFunction;
  }

});
