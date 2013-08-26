/**
@module ember
@submodule ember-states
*/

var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;
var arrayForEach = Ember.ArrayPolyfills.forEach;

require('ember-states/state');

/**
  A Transition takes the enter, exit and resolve states and normalizes
  them:

  * takes any passed in contexts into consideration
  * adds in `initialState`s

  @class Transition
  @private
*/
var Transition = function(raw) {
  this.enterStates = raw.enterStates.slice();
  this.exitStates = raw.exitStates.slice();
  this.resolveState = raw.resolveState;

  this.finalState = raw.enterStates[raw.enterStates.length - 1] || raw.resolveState;
};

Transition.prototype = {
  /**
    Normalize the passed in enter, exit and resolve states.

    This process also adds `finalState` and `contexts` to the Transition object.

    @method normalize
    @param {Ember.StateManager} manager the state manager running the transition
    @param {Array} contexts a list of contexts passed into `transitionTo`
  */
  normalize: function(manager, contexts) {
    this.matchContextsToStates(contexts);
    this.addInitialStates();
    this.removeUnchangedContexts(manager);
    return this;
  },

  /**
    Match each of the contexts passed to `transitionTo` to a state.
    This process may also require adding additional enter and exit
    states if there are more contexts than enter states.

    @method matchContextsToStates
    @param {Array} contexts a list of contexts passed into `transitionTo`
  */
  matchContextsToStates: function(contexts) {
    var stateIdx = this.enterStates.length - 1,
        matchedContexts = [],
        state,
        context;

    // Next, we will match the passed in contexts to the states they
    // represent.
    //
    // First, assign a context to each enter state in reverse order. If
    // any contexts are left, add a parent state to the list of states
    // to enter and exit, and assign a context to the parent state.
    //
    // If there are still contexts left when the state manager is
    // reached, raise an exception.
    //
    // This allows the following:
    //
    // |- root
    // | |- post
    // | | |- comments
    // | |- about (* current state)
    //
    // For `transitionTo('post.comments', post, post.get('comments')`,
    // the first context (`post`) will be assigned to `root.post`, and
    // the second context (`post.get('comments')`) will be assigned
    // to `root.post.comments`.
    //
    // For the following:
    //
    // |- root
    // | |- post
    // | | |- index (* current state)
    // | | |- comments
    //
    // For `transitionTo('post.comments', otherPost, otherPost.get('comments')`,
    // the `<root.post>` state will be added to the list of enter and exit
    // states because its context has changed.

    while (contexts.length > 0) {
      if (stateIdx >= 0) {
        state = this.enterStates[stateIdx--];
      } else {
        if (this.enterStates.length) {
          state = get(this.enterStates[0], 'parentState');
          if (!state) { throw "Cannot match all contexts to states"; }
        } else {
          // If re-entering the current state with a context, the resolve
          // state will be the current state.
          state = this.resolveState;
        }

        this.enterStates.unshift(state);
        this.exitStates.unshift(state);
      }

      // in routers, only states with dynamic segments have a context
      if (get(state, 'hasContext')) {
        context = contexts.pop();
      } else {
        context = null;
      }

      matchedContexts.unshift(context);
    }

    this.contexts = matchedContexts;
  },

  /**
    Add any `initialState`s to the list of enter states.

    @method addInitialStates
  */
  addInitialStates: function() {
    var finalState = this.finalState, initialState;

    while(true) {
      initialState = get(finalState, 'initialState') || 'start';
      finalState = get(finalState, 'states.' + initialState);

      if (!finalState) { break; }

      this.finalState = finalState;
      this.enterStates.push(finalState);
      this.contexts.push(undefined);
    }
  },

  /**
    Remove any states that were added because the number of contexts
    exceeded the number of explicit enter states, but the context has
    not changed since the last time the state was entered.

    @method removeUnchangedContexts
    @param {Ember.StateManager} manager passed in to look up the last
      context for a state
  */
  removeUnchangedContexts: function(manager) {
    // Start from the beginning of the enter states. If the state was added
    // to the list during the context matching phase, make sure the context
    // has actually changed since the last time the state was entered.
    while (this.enterStates.length > 0) {
      if (this.enterStates[0] !== this.exitStates[0]) { break; }

      if (this.enterStates.length === this.contexts.length) {
        if (manager.getStateMeta(this.enterStates[0], 'context') !== this.contexts[0]) { break; }
        this.contexts.shift();
      }

      this.resolveState = this.enterStates.shift();
      this.exitStates.shift();
    }
  }
};


/**
  Sends the event to the currentState, if the event is not handled this method 
  will proceed to call the parentState recursively until it encounters an 
  event handler or reaches the top or root of the state path hierarchy.

  @method sendRecursively
  @param event
  @param currentState
  @param isUnhandledPass
*/
var sendRecursively = function(event, currentState, isUnhandledPass) {
  var log = this.enableLogging,
      eventName = isUnhandledPass ? 'unhandledEvent' : event,
      action = currentState[eventName],
      contexts, sendRecursiveArguments, actionArguments;

  contexts = [].slice.call(arguments, 3);

  // Test to see if the action is a method that
  // can be invoked. Don't blindly check just for
  // existence, because it is possible the state
  // manager has a child state of the given name,
  // and we should still raise an exception in that
  // case.
  if (typeof action === 'function') {
    if (log) {
      if (isUnhandledPass) {
        Ember.Logger.log(fmt("STATEMANAGER: Unhandled event '%@' being sent to state %@.", [event, get(currentState, 'path')]));
      } else {
        Ember.Logger.log(fmt("STATEMANAGER: Sending event '%@' to state %@.", [event, get(currentState, 'path')]));
      }
    }

    actionArguments = contexts;
    if (isUnhandledPass) {
      actionArguments.unshift(event);
    }
    actionArguments.unshift(this);

    return action.apply(currentState, actionArguments);
  } else {
    var parentState = get(currentState, 'parentState');
    if (parentState) {

      sendRecursiveArguments = contexts;
      sendRecursiveArguments.unshift(event, parentState, isUnhandledPass);

      return sendRecursively.apply(this, sendRecursiveArguments);
    } else if (!isUnhandledPass) {
      return sendEvent.call(this, event, contexts, true);
    }
  }
};

/**
  Send an event to the currentState.
  
  @method sendEvent
  @param eventName
  @param sendRecursiveArguments
  @param isUnhandledPass
*/
var sendEvent = function(eventName, sendRecursiveArguments, isUnhandledPass) {
  sendRecursiveArguments.unshift(eventName, get(this, 'currentState'), isUnhandledPass);
  return sendRecursively.apply(this, sendRecursiveArguments);
};

/**
  StateManager is part of Ember's implementation of a finite state machine. A
  StateManager instance manages a number of properties that are instances of
  `Ember.State`,
  tracks the current active state, and triggers callbacks when states have changed.

  ## Defining States

  The states of StateManager can be declared in one of two ways. First, you can
  define a `states` property that contains all the states:

  ```javascript
  var managerA = Ember.StateManager.create({
    states: {
      stateOne: Ember.State.create(),
      stateTwo: Ember.State.create()
    }
  });

  managerA.get('states');
  // {
  //   stateOne: Ember.State.create(),
  //   stateTwo: Ember.State.create()
  // }
  ```

  You can also add instances of `Ember.State` (or an `Ember.State` subclass)
  directly as properties of a StateManager. These states will be collected into
  the `states` property for you.

  ```javascript
  var managerA = Ember.StateManager.create({
    stateOne: Ember.State.create(),
    stateTwo: Ember.State.create()
  });

  managerA.get('states');
  // {
  //   stateOne: Ember.State.create(),
  //   stateTwo: Ember.State.create()
  // }
  ```

  ## The Initial State

  When created a StateManager instance will immediately enter into the state
  defined as its `start` property or the state referenced by name in its
  `initialState` property:

  ```javascript
  var managerA = Ember.StateManager.create({
    start: Ember.State.create({})
  });

  managerA.get('currentState.name'); // 'start'

  var managerB = Ember.StateManager.create({
    initialState: 'beginHere',
    beginHere: Ember.State.create({})
  });

  managerB.get('currentState.name'); // 'beginHere'
  ```

  Because it is a property you may also provide a computed function if you wish
  to derive an `initialState` programmatically:

  ```javascript
  var managerC = Ember.StateManager.create({
    initialState: function() {
      if (someLogic) {
        return 'active';
      } else {
        return 'passive';
      }
    }.property(),
    active: Ember.State.create({}),
    passive: Ember.State.create({})
  });
  ```

  ## Moving Between States

  A StateManager can have any number of `Ember.State` objects as properties
  and can have a single one of these states as its current state.

  Calling `transitionTo` transitions between states:

  ```javascript
  var robotManager = Ember.StateManager.create({
    initialState: 'poweredDown',
    poweredDown: Ember.State.create({}),
    poweredUp: Ember.State.create({})
  });

  robotManager.get('currentState.name'); // 'poweredDown'
  robotManager.transitionTo('poweredUp');
  robotManager.get('currentState.name'); // 'poweredUp'
  ```

  Before transitioning into a new state the existing `currentState` will have
  its `exit` method called with the StateManager instance as its first argument
  and an object representing the transition as its second argument.

  After transitioning into a new state the new `currentState` will have its
  `enter` method called with the StateManager instance as its first argument
  and an object representing the transition as its second argument.

  ```javascript
  var robotManager = Ember.StateManager.create({
    initialState: 'poweredDown',
    poweredDown: Ember.State.create({
      exit: function(stateManager) {
        console.log("exiting the poweredDown state")
      }
    }),
    poweredUp: Ember.State.create({
      enter: function(stateManager) {
        console.log("entering the poweredUp state. Destroy all humans.")
      }
    })
  });

  robotManager.get('currentState.name'); // 'poweredDown'
  robotManager.transitionTo('poweredUp');

  // will log
  // 'exiting the poweredDown state'
  // 'entering the poweredUp state. Destroy all humans.'
  ```

  Once a StateManager is already in a state, subsequent attempts to enter that
  state will not trigger enter or exit method calls. Attempts to transition
  into a state that the manager does not have will result in no changes in the
  StateManager's current state:

  ```javascript
  var robotManager = Ember.StateManager.create({
    initialState: 'poweredDown',
    poweredDown: Ember.State.create({
      exit: function(stateManager) {
        console.log("exiting the poweredDown state")
      }
    }),
    poweredUp: Ember.State.create({
      enter: function(stateManager) {
        console.log("entering the poweredUp state. Destroy all humans.")
      }
    })
  });

  robotManager.get('currentState.name'); // 'poweredDown'
  robotManager.transitionTo('poweredUp');
  // will log
  // 'exiting the poweredDown state'
  // 'entering the poweredUp state. Destroy all humans.'
  robotManager.transitionTo('poweredUp'); // no logging, no state change

  robotManager.transitionTo('someUnknownState'); // silently fails
  robotManager.get('currentState.name'); // 'poweredUp'
  ```

  Each state property may itself contain properties that are instances of
  `Ember.State`. The StateManager can transition to specific sub-states in a
  series of transitionTo method calls or via a single transitionTo with the
  full path to the specific state. The StateManager will also keep track of the
  full path to its currentState

  ```javascript
  var robotManager = Ember.StateManager.create({
    initialState: 'poweredDown',
    poweredDown: Ember.State.create({
      charging: Ember.State.create(),
      charged: Ember.State.create()
    }),
    poweredUp: Ember.State.create({
      mobile: Ember.State.create(),
      stationary: Ember.State.create()
    })
  });

  robotManager.get('currentState.name'); // 'poweredDown'

  robotManager.transitionTo('poweredUp');
  robotManager.get('currentState.name'); // 'poweredUp'

  robotManager.transitionTo('mobile');
  robotManager.get('currentState.name'); // 'mobile'

  // transition via a state path
  robotManager.transitionTo('poweredDown.charging');
  robotManager.get('currentState.name'); // 'charging'

  robotManager.get('currentState.path'); // 'poweredDown.charging'
  ```

  Enter transition methods will be called for each state and nested child state
  in their hierarchical order. Exit methods will be called for each state and
  its nested states in reverse hierarchical order.

  Exit transitions for a parent state are not called when entering into one of
  its child states, only when transitioning to a new section of possible states
  in the hierarchy.

  ```javascript
  var robotManager = Ember.StateManager.create({
    initialState: 'poweredDown',
    poweredDown: Ember.State.create({
      enter: function() {},
      exit: function() {
        console.log("exited poweredDown state")
      },
      charging: Ember.State.create({
        enter: function() {},
        exit: function() {}
      }),
      charged: Ember.State.create({
        enter: function() {
          console.log("entered charged state")
        },
        exit: function() {
          console.log("exited charged state")
        }
      })
    }),
    poweredUp: Ember.State.create({
      enter: function() {
        console.log("entered poweredUp state")
      },
      exit: function() {},
      mobile: Ember.State.create({
        enter: function() {
          console.log("entered mobile state")
        },
        exit: function() {}
      }),
      stationary: Ember.State.create({
        enter: function() {},
        exit: function() {}
      })
    })
  });


  robotManager.get('currentState.path'); // 'poweredDown'
  robotManager.transitionTo('charged');
  // logs 'entered charged state'
  // but does *not* log  'exited poweredDown state'
  robotManager.get('currentState.name'); // 'charged

  robotManager.transitionTo('poweredUp.mobile');
  // logs
  // 'exited charged state'
  // 'exited poweredDown state'
  // 'entered poweredUp state'
  // 'entered mobile state'
  ```

  During development you can set a StateManager's `enableLogging` property to
  `true` to receive console messages of state transitions.

  ```javascript
  var robotManager = Ember.StateManager.create({
    enableLogging: true
  });
  ```

  ## Managing currentState with Actions

  To control which transitions are possible for a given state, and
  appropriately handle external events, the StateManager can receive and
  route action messages to its states via the `send` method. Calling to
  `send` with an action name will begin searching for a method with the same
  name starting at the current state and moving up through the parent states
  in a state hierarchy until an appropriate method is found or the StateManager
  instance itself is reached.

  If an appropriately named method is found it will be called with the state
  manager as the first argument and an optional `context` object as the second
  argument.

  ```javascript
  var managerA = Ember.StateManager.create({
    initialState: 'stateOne.substateOne.subsubstateOne',
    stateOne: Ember.State.create({
      substateOne: Ember.State.create({
        anAction: function(manager, context) {
          console.log("an action was called")
        },
        subsubstateOne: Ember.State.create({})
      })
    })
  });

  managerA.get('currentState.name'); // 'subsubstateOne'
  managerA.send('anAction');
  // 'stateOne.substateOne.subsubstateOne' has no anAction method
  // so the 'anAction' method of 'stateOne.substateOne' is called
  // and logs "an action was called"
  // with managerA as the first argument
  // and no second argument

  var someObject = {};
  managerA.send('anAction', someObject);
  // the 'anAction' method of 'stateOne.substateOne' is called again
  // with managerA as the first argument and
  // someObject as the second argument.
  ```

  If the StateManager attempts to send an action but does not find an appropriately named
  method in the current state or while moving upwards through the state hierarchy, it will
  repeat the process looking for a `unhandledEvent` method. If an `unhandledEvent` method is
  found, it will be called with the original event name as the second argument. If an
  `unhandledEvent` method is not found, the StateManager will throw a new Ember.Error.

  ```javascript
  var managerB = Ember.StateManager.create({
    initialState: 'stateOne.substateOne.subsubstateOne',
    stateOne: Ember.State.create({
      substateOne: Ember.State.create({
        subsubstateOne: Ember.State.create({}),
        unhandledEvent: function(manager, eventName, context) {
          console.log("got an unhandledEvent with name " + eventName);
        }
      })
    })
  });

  managerB.get('currentState.name'); // 'subsubstateOne'
  managerB.send('anAction');
  // neither `stateOne.substateOne.subsubstateOne` nor any of it's
  // parent states have a handler for `anAction`. `subsubstateOne`
  // also does not have a `unhandledEvent` method, but its parent
  // state, `substateOne`, does, and it gets fired. It will log
  // "got an unhandledEvent with name anAction"
  ```

  Action detection only moves upwards through the state hierarchy from the current state.
  It does not search in other portions of the hierarchy.

  ```javascript
  var managerC = Ember.StateManager.create({
    initialState: 'stateOne.substateOne.subsubstateOne',
    stateOne: Ember.State.create({
      substateOne: Ember.State.create({
        subsubstateOne: Ember.State.create({})
      })
    }),
    stateTwo: Ember.State.create({
      anAction: function(manager, context) {
        // will not be called below because it is
        // not a parent of the current state
      }
    })
  });

  managerC.get('currentState.name'); // 'subsubstateOne'
  managerC.send('anAction');
  // Error: <Ember.StateManager:ember132> could not
  // respond to event anAction in state stateOne.substateOne.subsubstateOne.
  ```

  Inside of an action method the given state should delegate `transitionTo` calls on its
  StateManager.

  ```javascript
  var robotManager = Ember.StateManager.create({
    initialState: 'poweredDown.charging',
    poweredDown: Ember.State.create({
      charging: Ember.State.create({
        chargeComplete: function(manager, context) {
          manager.transitionTo('charged')
        }
      }),
      charged: Ember.State.create({
        boot: function(manager, context) {
          manager.transitionTo('poweredUp')
        }
      })
    }),
    poweredUp: Ember.State.create({
      beginExtermination: function(manager, context) {
        manager.transitionTo('rampaging')
      },
      rampaging: Ember.State.create()
    })
  });

  robotManager.get('currentState.name'); // 'charging'
  robotManager.send('boot'); // throws error, no boot action
                            // in current hierarchy
  robotManager.get('currentState.name'); // remains 'charging'

  robotManager.send('beginExtermination'); // throws error, no beginExtermination
                                          // action in current hierarchy
  robotManager.get('currentState.name');   // remains 'charging'

  robotManager.send('chargeComplete');
  robotManager.get('currentState.name');   // 'charged'

  robotManager.send('boot');
  robotManager.get('currentState.name');   // 'poweredUp'

  robotManager.send('beginExtermination', allHumans);
  robotManager.get('currentState.name');   // 'rampaging'
  ```

  Transition actions can also be created using the `transitionTo` method of the `Ember.State` class. The
  following example StateManagers are equivalent:

  ```javascript
  var aManager = Ember.StateManager.create({
    stateOne: Ember.State.create({
      changeToStateTwo: Ember.State.transitionTo('stateTwo')
    }),
    stateTwo: Ember.State.create({})
  });

  var bManager = Ember.StateManager.create({
    stateOne: Ember.State.create({
      changeToStateTwo: function(manager, context) {
        manager.transitionTo('stateTwo', context)
      }
    }),
    stateTwo: Ember.State.create({})
  });
  ```

  @class StateManager
  @namespace Ember
  @extends Ember.State
**/
Ember.StateManager = Ember.State.extend({
  /**
    @private

    When creating a new statemanager, look for a default state to transition
    into. This state can either be named `start`, or can be specified using the
    `initialState` property.

    @method init
  */
  init: function() {
    this._super();

    set(this, 'stateMeta', Ember.Map.create());

    var initialState = get(this, 'initialState');

    if (!initialState && get(this, 'states.start')) {
      initialState = 'start';
    }

    if (initialState) {
      this.transitionTo(initialState);
      Ember.assert('Failed to transition to initial state "' + initialState + '"', !!get(this, 'currentState'));
    }
  },

  /**
    Return the stateMeta, a hash of possible states. If no items exist in the stateMeta hash
    this method sets the stateMeta to an empty JavaScript object and returns that instead.

    @method stateMetaFor
    @param state
  */
  stateMetaFor: function(state) {
    var meta = get(this, 'stateMeta'),
        stateMeta = meta.get(state);

    if (!stateMeta) {
      stateMeta = {};
      meta.set(state, stateMeta);
    }

    return stateMeta;
  },

  /**
    Sets a key value pair on the stateMeta hash.

    @method setStateMeta
    @param state
    @param key
    @param value
  */
  setStateMeta: function(state, key, value) {
    return set(this.stateMetaFor(state), key, value);
  },

  /**
    Returns the value of an item in the stateMeta hash at the given key.

    @method getStateMeta
    @param state
    @param key
  */
  getStateMeta: function(state, key) {
    return get(this.stateMetaFor(state), key);
  },

  /**
    The current state from among the manager's possible states. This property should
    not be set directly. Use `transitionTo` to move between states by name.

    @property currentState
    @type Ember.State
  */
  currentState: null,

  /**
   The path of the current state. Returns a string representation of the current
   state.

   @property currentPath
   @type String
  */
  currentPath: Ember.computed.alias('currentState.path'),

  /**
    The name of transitionEvent that this stateManager will dispatch

    @property transitionEvent
    @type String
    @default 'setup'
  */
  transitionEvent: 'setup',

  /**
    If set to true, `errorOnUnhandledEvents` will cause an exception to be
    raised if you attempt to send an event to a state manager that is not
    handled by the current state or any of its parent states.

    @property errorOnUnhandledEvents
    @type Boolean
    @default true
  */
  errorOnUnhandledEvent: true,

  /**
    An alias to sendEvent method

    @method send
    @param event
  */
  send: function(event) {
    var contexts = [].slice.call(arguments, 1);
    Ember.assert('Cannot send event "' + event + '" while currentState is ' + get(this, 'currentState'), get(this, 'currentState'));
    return sendEvent.call(this, event, contexts, false);
  },

  /**
    If errorOnUnhandledEvent is true this event with throw an Ember.Error
    indicating that the no state could respond to the event passed through the
    state machine.

    @method unhandledEvent
    @param manager
    @param event
  */
  unhandledEvent: function(manager, event) {
    if (get(this, 'errorOnUnhandledEvent')) {
      throw new Ember.Error(this.toString() + " could not respond to event " + event + " in state " + get(this, 'currentState.path') + ".");
    }
  },

  /**
    Finds a state by its state path.

    Example:

    ```javascript
    var manager = Ember.StateManager.create({
      root: Ember.State.create({
        dashboard: Ember.State.create()
      })
    });

    manager.getStateByPath(manager, "root.dashboard");
    // returns the dashboard state
  
    var aState = manager.getStateByPath(manager, "root.dashboard");

    var path = aState.get('path');
    // path is 'root.dashboard'

    var name = aState.get('name');
    // name is 'dashboard'
    ```

    @method getStateByPath
    @param {Ember.State} root the state to start searching from
    @param {String} path the state path to follow
    @return {Ember.State} the state at the end of the path
  */
  getStateByPath: function(root, path) {
    var parts = path.split('.'),
        state = root;

    for (var i=0, len=parts.length; i<len; i++) {
      state = get(get(state, 'states'), parts[i]);
      if (!state) { break; }
    }

    return state;
  },

  findStateByPath: function(state, path) {
    var possible;

    while (!possible && state) {
      possible = this.getStateByPath(state, path);
      state = get(state, 'parentState');
    }

    return possible;
  },

  /**
    A state stores its child states in its `states` hash.
    This code takes a path like `posts.show` and looks
    up `root.states.posts.states.show`.

    It returns a list of all of the states from the
    root, which is the list of states to call `enter`
    on.

    @method getStatesInPath
    @param root
    @param path
  */
  getStatesInPath: function(root, path) {
    if (!path || path === "") { return undefined; }
    var parts = path.split('.'),
        result = [],
        states,
        state;

    for (var i=0, len=parts.length; i<len; i++) {
      states = get(root, 'states');
      if (!states) { return undefined; }
      state = get(states, parts[i]);
      if (state) { root = state; result.push(state); }
      else { return undefined; }
    }

    return result;
  },

  /**
    Alias for transitionTo.
    This method applies a transitionTo to the arguments passed into this method. 

    @method goToState
  */
  goToState: function() {
    // not deprecating this yet so people don't constantly need to
    // make trivial changes for little reason.
    return this.transitionTo.apply(this, arguments);
  },

  /**
    Transition to another state within the state machine. If the path is empty returns
    immediately. This method attempts to get a hash of the enter, exit and resolve states
    from the existing state cache. Processes the raw state information based on the
    passed in context. Creates a new transition object and triggers a new setupContext.

    @method transitionTo
    @param path
    @param context
  */
  transitionTo: function(path, context) {
    // XXX When is transitionTo called with no path
    if (Ember.isEmpty(path)) { return; }

    // The ES6 signature of this function is `path, ...contexts`
    var contexts = context ? Array.prototype.slice.call(arguments, 1) : [],
        currentState = get(this, 'currentState') || this;

    // First, get the enter, exit and resolve states for the current state
    // and specified path. If possible, use an existing cache.
    var hash = this.contextFreeTransition(currentState, path);

    // Next, process the raw state information for the contexts passed in.
    var transition = new Transition(hash).normalize(this, contexts);

    this.enterState(transition);
    this.triggerSetupContext(transition);
  },

  /**
    Allows you to transition to any other state in the state manager without
    being constrained by the state hierarchy of the current state path.
    This method will traverse the state path upwards through its parents until
    it finds the specified state path. All the transitions are captured during the
    traversal. 

    Caches and returns hash of transitions, which contain the exitSates, enterStates and 
    resolvedState

    @method contextFreeTransition
    @param currentState
    @param path
  */
  contextFreeTransition: function(currentState, path) {
    var cache = currentState.getPathsCache(this, path);
    if (cache) { return cache; }

    var enterStates = this.getStatesInPath(currentState, path),
        exitStates = [],
        resolveState = currentState;

    // Walk up the states. For each state, check whether a state matching
    // the `path` is nested underneath. This will find the closest
    // parent state containing `path`.
    //
    // This allows the user to pass in a relative path. For example, for
    // the following state hierarchy:
    //
    //    | |root
    //    | |- posts
    //    | | |- show (* current)
    //    | |- comments
    //    | | |- show
    //
    // If the current state is `<root.posts.show>`, an attempt to
    // transition to `comments.show` will match `<root.comments.show>`.
    //
    // First, this code will look for root.posts.show.comments.show.
    // Next, it will look for root.posts.comments.show. Finally,
    // it will look for `root.comments.show`, and find the state.
    //
    // After this process, the following variables will exist:
    //
    // * resolveState: a common parent state between the current
    //   and target state. In the above example, `<root>` is the
    //   `resolveState`.
    // * enterStates: a list of all of the states represented
    //   by the path from the `resolveState`. For example, for
    //   the path `root.comments.show`, `enterStates` would have
    //   `[<root.comments>, <root.comments.show>]`
    // * exitStates: a list of all of the states from the
    //   `resolveState` to the `currentState`. In the above
    //   example, `exitStates` would have
    //   `[<root.posts>`, `<root.posts.show>]`.
    while (resolveState && !enterStates) {
      exitStates.unshift(resolveState);

      resolveState = get(resolveState, 'parentState');
      if (!resolveState) {
        enterStates = this.getStatesInPath(this, path);
        if (!enterStates) {
          Ember.assert('Could not find state for path: "'+path+'"');
          return;
        }
      }
      enterStates = this.getStatesInPath(resolveState, path);
    }

    // If the path contains some states that are parents of both the
    // current state and the target state, remove them.
    //
    // For example, in the following hierarchy:
    //
    // |- root
    // | |- post
    // | | |- index (* current)
    // | | |- show
    //
    // If the `path` is `root.post.show`, the three variables will
    // be:
    //
    // * resolveState: `<state manager>`
    // * enterStates: `[<root>, <root.post>, <root.post.show>]`
    // * exitStates: `[<root>, <root.post>, <root.post.index>]`
    //
    // The goal of this code is to remove the common states, so we
    // have:
    //
    // * resolveState: `<root.post>`
    // * enterStates: `[<root.post.show>]`
    // * exitStates: `[<root.post.index>]`
    //
    // This avoid unnecessary calls to the enter and exit transitions.
    while (enterStates.length > 0 && enterStates[0] === exitStates[0]) {
      resolveState = enterStates.shift();
      exitStates.shift();
    }

    // Cache the enterStates, exitStates, and resolveState for the
    // current state and the `path`.
    var transitions = {
      exitStates: exitStates,
      enterStates: enterStates,
      resolveState: resolveState
    };

    currentState.setPathsCache(this, path, transitions);

    return transitions;
  },

  /**
    A trigger to setup the state contexts. Each state is setup with
    an enterState.

    @method triggerSetupContext
    @param transitions
  */
  triggerSetupContext: function(transitions) {
    var contexts = transitions.contexts,
        offset = transitions.enterStates.length - contexts.length,
        enterStates = transitions.enterStates,
        transitionEvent = get(this, 'transitionEvent');

    Ember.assert("More contexts provided than states", offset >= 0);

    arrayForEach.call(enterStates, function(state, idx) {
      state.trigger(transitionEvent, this, contexts[idx-offset]);
    }, this);
  },

  /**
    Returns the state instance by name. If state is not found the parentState
    is returned instead.

    @method getState
    @param name
  */
  getState: function(name) {
    var state = get(this, name),
        parentState = get(this, 'parentState');

    if (state) {
      return state;
    } else if (parentState) {
      return parentState.getState(name);
    }
  },

  /**
    Causes a transition from the exitState of one state to the enterState of another
    state in the state machine. At the end of the transition the currentState is set
    to the finalState of the transition passed into this method.

    @method enterState
    @param transition
  */
  enterState: function(transition) {
    var log = this.enableLogging;

    var exitStates = transition.exitStates.slice(0).reverse();
    arrayForEach.call(exitStates, function(state) {
      state.trigger('exit', this);
    }, this);

    arrayForEach.call(transition.enterStates, function(state) {
      if (log) { Ember.Logger.log("STATEMANAGER: Entering " + get(state, 'path')); }
      state.trigger('enter', this);
    }, this);

    set(this, 'currentState', transition.finalState);
  }
});
