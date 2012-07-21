var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;
var arrayForEach = Ember.ArrayPolyfills.forEach;

require('ember-states/state');

/**
  @class

  StateManager is part of Ember's implementation of a finite state machine. A StateManager
  instance manages a number of properties that are instances of `Ember.State`,
  tracks the current active state, and triggers callbacks when states have changed.

  ## Defining States

  The states of StateManager can be declared in one of two ways. First, you can define
  a `states` property that contains all the states:

      managerA = Ember.StateManager.create({
        states: {
          stateOne: Ember.State.create(),
          stateTwo: Ember.State.create()
        }
      })

      managerA.get('states')
      // {
      //   stateOne: Ember.State.create(),
      //   stateTwo: Ember.State.create()
      // }

  You can also add instances of `Ember.State` (or an `Ember.State` subclass) directly as properties
  of a StateManager. These states will be collected into the `states` property for you.

      managerA = Ember.StateManager.create({
        stateOne: Ember.State.create(),
        stateTwo: Ember.State.create()
      })

      managerA.get('states')
      // {
      //   stateOne: Ember.State.create(),
      //   stateTwo: Ember.State.create()
      // }

  ## The Initial State
  When created a StateManager instance will immediately enter into the state
  defined as its `start` property or the state referenced by name in its
  `initialState` property:

      managerA = Ember.StateManager.create({
        start: Ember.State.create({})
      })

      managerA.get('currentState.name') // 'start'

      managerB = Ember.StateManager.create({
        initialState: 'beginHere',
        beginHere: Ember.State.create({})
      })

      managerB.get('currentState.name') // 'beginHere'

  Because it is a property you may also provide a computed function if you wish to derive
  an `initialState` programmatically:

      managerC = Ember.StateManager.create({
        initialState: function(){
          if (someLogic) {
            return 'active';
          } else {
            return 'passive';
          }
        }.property(),
        active: Ember.State.create({}),
        passive: Ember.State.create({})
      })

  ## Moving Between States
  A StateManager can have any number of Ember.State objects as properties
  and can have a single one of these states as its current state.

  Calling `transitionTo` transitions between states:

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown',
        poweredDown: Ember.State.create({}),
        poweredUp: Ember.State.create({})
      })

      robotManager.get('currentState.name') // 'poweredDown'
      robotManager.transitionTo('poweredUp')
      robotManager.get('currentState.name') // 'poweredUp'

  Before transitioning into a new state the existing `currentState` will have its
  `exit` method called with the StateManager instance as its first argument and
  an object representing the transition as its second argument.

  After transitioning into a new state the new `currentState` will have its
  `enter` method called with the StateManager instance as its first argument and
  an object representing the transition as its second argument.

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown',
        poweredDown: Ember.State.create({
          exit: function(stateManager){
            console.log("exiting the poweredDown state")
          }
        }),
        poweredUp: Ember.State.create({
          enter: function(stateManager){
            console.log("entering the poweredUp state. Destroy all humans.")
          }
        })
      })

      robotManager.get('currentState.name') // 'poweredDown'
      robotManager.transitionTo('poweredUp')
      // will log
      // 'exiting the poweredDown state'
      // 'entering the poweredUp state. Destroy all humans.'


  Once a StateManager is already in a state, subsequent attempts to enter that state will
  not trigger enter or exit method calls. Attempts to transition into a state that the
  manager does not have will result in no changes in the StateManager's current state:

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown',
        poweredDown: Ember.State.create({
          exit: function(stateManager){
            console.log("exiting the poweredDown state")
          }
        }),
        poweredUp: Ember.State.create({
          enter: function(stateManager){
            console.log("entering the poweredUp state. Destroy all humans.")
          }
        })
      })

      robotManager.get('currentState.name') // 'poweredDown'
      robotManager.transitionTo('poweredUp')
      // will log
      // 'exiting the poweredDown state'
      // 'entering the poweredUp state. Destroy all humans.'
      robotManager.transitionTo('poweredUp') // no logging, no state change

      robotManager.transitionTo('someUnknownState') // silently fails
      robotManager.get('currentState.name') // 'poweredUp'


  Each state property may itself contain properties that are instances of Ember.State.
  The StateManager can transition to specific sub-states in a series of transitionTo method calls or
  via a single transitionTo with the full path to the specific state. The StateManager will also
  keep track of the full path to its currentState

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown',
        poweredDown: Ember.State.create({
          charging: Ember.State.create(),
          charged: Ember.State.create()
        }),
        poweredUp: Ember.State.create({
          mobile: Ember.State.create(),
          stationary: Ember.State.create()
        })
      })

      robotManager.get('currentState.name') // 'poweredDown'

      robotManager.transitionTo('poweredUp')
      robotManager.get('currentState.name') // 'poweredUp'

      robotManager.transitionTo('mobile')
      robotManager.get('currentState.name') // 'mobile'

      // transition via a state path
      robotManager.transitionTo('poweredDown.charging')
      robotManager.get('currentState.name') // 'charging'

      robotManager.get('currentState.path') // 'poweredDown.charging'

  Enter transition methods will be called for each state and nested child state in their
  hierarchical order.  Exit methods will be called for each state and its nested states in
  reverse hierarchical order.

  Exit transitions for a parent state are not called when entering into one of its child states,
  only when transitioning to a new section of possible states in the hierarchy.

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown',
        poweredDown: Ember.State.create({
          enter: function(){},
          exit: function(){
            console.log("exited poweredDown state")
          },
          charging: Ember.State.create({
            enter: function(){},
            exit: function(){}
          }),
          charged: Ember.State.create({
            enter: function(){
              console.log("entered charged state")
            },
            exit: function(){
              console.log("exited charged state")
            }
          })
        }),
        poweredUp: Ember.State.create({
          enter: function(){
            console.log("entered poweredUp state")
          },
          exit: function(){},
          mobile: Ember.State.create({
            enter: function(){
              console.log("entered mobile state")
            },
            exit: function(){}
          }),
          stationary: Ember.State.create({
            enter: function(){},
            exit: function(){}
          })
        })
      })


      robotManager.get('currentState.path') // 'poweredDown'
      robotManager.transitionTo('charged')
      // logs 'entered charged state'
      // but does *not* log  'exited poweredDown state'
      robotManager.get('currentState.name') // 'charged

      robotManager.transitionTo('poweredUp.mobile')
      // logs
      // 'exited charged state'
      // 'exited poweredDown state'
      // 'entered poweredUp state'
      // 'entered mobile state'

  During development you can set a StateManager's `enableLogging` property to `true` to
  receive console messages of state transitions.

      robotManager = Ember.StateManager.create({
        enableLogging: true
      })

  ## Managing currentState with Actions
  To control which transitions between states are possible for a given state, StateManager
  can receive and route action messages to its states via the `send` method.  Calling to `send` with
  an action name will begin searching for a method with the same name starting at the current state
  and moving up through the parent states in a state hierarchy until an appropriate method is found
  or the StateManager instance itself is reached.

  If an appropriately named method is found it will be called with the state manager as the first
  argument and an optional `context` object as the second argument.

      managerA = Ember.StateManager.create({
        initialState: 'stateOne.substateOne.subsubstateOne',
        stateOne: Ember.State.create({
          substateOne: Ember.State.create({
            anAction: function(manager, context){
              console.log("an action was called")
            },
            subsubstateOne: Ember.State.create({})
          })
        })
      })

      managerA.get('currentState.name') // 'subsubstateOne'
      managerA.send('anAction')
      // 'stateOne.substateOne.subsubstateOne' has no anAction method
      // so the 'anAction' method of 'stateOne.substateOne' is called
      // and logs "an action was called"
      // with managerA as the first argument
      // and no second argument

      someObject = {}
      managerA.send('anAction', someObject)
      // the 'anAction' method of 'stateOne.substateOne' is called again
      // with managerA as the first argument and
      // someObject as the second argument.


  If the StateManager attempts to send an action but does not find an appropriately named
  method in the current state or while moving upwards through the state hierarchy
  it will throw a new Ember.Error. Action detection only moves upwards through the state hierarchy
  from the current state. It does not search in other portions of the hierarchy.

      managerB = Ember.StateManager.create({
        initialState: 'stateOne.substateOne.subsubstateOne',
        stateOne: Ember.State.create({
          substateOne: Ember.State.create({
            subsubstateOne: Ember.State.create({})
          })
        }),
        stateTwo: Ember.State.create({
         anAction: function(manager, context){
           // will not be called below because it is
           // not a parent of the current state
         }
        })
      })

      managerB.get('currentState.name') // 'subsubstateOne'
      managerB.send('anAction')
      // Error: <Ember.StateManager:ember132> could not
      // respond to event anAction in state stateOne.substateOne.subsubstateOne.

  Inside of an action method the given state should delegate `transitionTo` calls on its
  StateManager.

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown.charging',
        poweredDown: Ember.State.create({
          charging: Ember.State.create({
            chargeComplete: function(manager, context){
              manager.transitionTo('charged')
            }
          }),
          charged: Ember.State.create({
            boot: function(manager, context){
              manager.transitionTo('poweredUp')
            }
          })
        }),
        poweredUp: Ember.State.create({
          beginExtermination: function(manager, context){
            manager.transitionTo('rampaging')
          },
          rampaging: Ember.State.create()
        })
      })

      robotManager.get('currentState.name') // 'charging'
      robotManager.send('boot') // throws error, no boot action
                                // in current hierarchy
      robotManager.get('currentState.name') // remains 'charging'

      robotManager.send('beginExtermination') // throws error, no beginExtermination
                                              // action in current hierarchy
      robotManager.get('currentState.name') // remains 'charging'

      robotManager.send('chargeComplete')
      robotManager.get('currentState.name') // 'charged'

      robotManager.send('boot')
      robotManager.get('currentState.name') // 'poweredUp'

      robotManager.send('beginExtermination', allHumans)
      robotManager.get('currentState.name') // 'rampaging'

  Transition actions can also be created using the `transitionTo` method of the Ember.State class. The
  following example StateManagers are equivalent: 
  
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
**/
Ember.StateManager = Ember.State.extend(
/** @scope Ember.StateManager.prototype */ {

  /**
    When creating a new statemanager, look for a default state to transition
    into. This state can either be named `start`, or can be specified using the
    `initialState` property.
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

  stateMetaFor: function(state) {
    var meta = get(this, 'stateMeta'),
        stateMeta = meta.get(state);

    if (!stateMeta) {
      stateMeta = {};
      meta.set(state, stateMeta);
    }

    return stateMeta;
  },

  setStateMeta: function(state, key, value) {
    return set(this.stateMetaFor(state), key, value);
  },

  getStateMeta: function(state, key) {
    return get(this.stateMetaFor(state), key);
  },

  /**
    The current state from among the manager's possible states. This property should
    not be set directly.  Use `transitionTo` to move between states by name.

    @type Ember.State
    @readOnly
  */
  currentState: null,

  /**
    The name of transitionEvent that this stateManager will dispatch

    @property {String}
    @default 'setup'
  */
  transitionEvent: 'setup',

  /**
    If set to true, `errorOnUnhandledEvents` will cause an exception to be
    raised if you attempt to send an event to a state manager that is not
    handled by the current state or any of its parent states.

    @type Boolean
    @default true
  */
  errorOnUnhandledEvent: true,
  
  send: function(event, context) {
    Ember.assert('Cannot send event "' + event + '" while currentState is ' + get(this, 'currentState'), get(this, 'currentState'));
    return this.sendRecursively(event, get(this, 'currentState'), context);
  },

  sendRecursively: function(event, currentState, context) {
    var log = this.enableLogging,
        action = currentState[event];

    // Test to see if the action is a method that
    // can be invoked. Don't blindly check just for
    // existence, because it is possible the state
    // manager has a child state of the given name,
    // and we should still raise an exception in that
    // case.
    if (typeof action === 'function') {
      if (log) { Ember.Logger.log(fmt("STATEMANAGER: Sending event '%@' to state %@.", [event, get(currentState, 'path')])); }
      return action.call(currentState, this, context);
    } else {
      var parentState = get(currentState, 'parentState');
      if (parentState) {
        return this.sendRecursively(event, parentState, context);
      } else if (get(this, 'errorOnUnhandledEvent')) {
        throw new Ember.Error(this.toString() + " could not respond to event " + event + " in state " + get(this, 'currentState.path') + ".");
      }
    }
  },

  /**
    Finds a state by its state path.

    Example:

        manager = Ember.StateManager.create({
          root: Ember.State.create({
            dashboard: Ember.State.create()
          })
        });

        manager.getStateByPath(manager, "root.dashboard")

        // returns the dashboard state

    @param {Ember.State} root the state to start searching from
    @param {String} path the state path to follow
    @returns {Ember.State} the state at the end of the path
  */
  getStateByPath: function(root, path) {
    var parts = path.split('.'),
        state = root;

    for (var i=0, l=parts.length; i<l; i++) {
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

  findStatesByPath: function(state, path) {
    if (!path || path === "") { return undefined; }
    var r = path.split('.'),
        ret = [];

    for (var i=0, len = r.length; i < len; i++) {
      var states = get(state, 'states');

      if (!states) { return undefined; }

      var s = get(states, r[i]);
      if (s) { state = s; ret.push(s); }
      else { return undefined; }
    }

    return ret;
  },

  goToState: function() {
    // not deprecating this yet so people don't constantly need to
    // make trivial changes for little reason.
    return this.transitionTo.apply(this, arguments);
  },

  transitionTo: function(path, context) {
    // 1. Normalize arguments
    // 2. Ensure that we are in the correct state
    // 3. Map provided path to context objects and send
    //    appropriate transitionEvent events

    if (Ember.empty(path)) { return; }

    var contexts = context ? Array.prototype.slice.call(arguments, 1) : [],
        currentState = get(this, 'currentState') || this,
        resolveState = currentState,
        exitStates = [],
        matchedContexts = [],
        cachedPath,
        enterStates,
        state,
        initialState,
        stateIdx,
        useContext;

    if (!context && (cachedPath = currentState.pathsCacheNoContext[path])) {
      // fast path

      exitStates = cachedPath.exitStates;
      enterStates = cachedPath.enterStates;
      resolveState = cachedPath.resolveState;
    } else {
      // normal path

      if ((cachedPath = currentState.pathsCache[path])) {
        // cache hit

        exitStates = cachedPath.exitStates;
        enterStates = cachedPath.enterStates;
        resolveState = cachedPath.resolveState;
      } else {
        // cache miss

        enterStates = this.findStatesByPath(currentState, path);

        while (resolveState && !enterStates) {
          exitStates.unshift(resolveState);

          resolveState = get(resolveState, 'parentState');
          if (!resolveState) {
            enterStates = this.findStatesByPath(this, path);
            if (!enterStates) { return; }
          }
          enterStates = this.findStatesByPath(resolveState, path);
        }

        while (enterStates.length > 0 && enterStates[0] === exitStates[0]) {
          resolveState = enterStates.shift();
          exitStates.shift();
        }

        currentState.pathsCache[path] = {
          exitStates: exitStates,
          enterStates: enterStates,
          resolveState: resolveState
        };
      }

      // Don't modify the cached versions
      enterStates = enterStates.slice();
      exitStates = exitStates.slice();

      stateIdx = enterStates.length-1;
      while (contexts.length > 0) {
        if (stateIdx >= 0) {
          state = enterStates[stateIdx--];
        } else {
          state = enterStates[0] ? get(enterStates[0], 'parentState') : resolveState;
          if (!state) { throw "Cannot match all contexts to states"; }
          enterStates.unshift(state);
          exitStates.unshift(state);
        }

        useContext = context && get(state, 'hasContext');
        matchedContexts.unshift(useContext ? contexts.pop() : null);
      }

      state = enterStates[enterStates.length - 1] || resolveState;
      while(true) {
        initialState = get(state, 'initialState') || 'start';
        state = get(state, 'states.'+initialState);
        if (!state) { break; }
        enterStates.push(state);
        matchedContexts.push(undefined);
      }

      while (enterStates.length > 0) {
        if (enterStates[0] !== exitStates[0]) { break; }

        if (enterStates.length === matchedContexts.length) {
          if (this.getStateMeta(enterStates[0], 'context') !== matchedContexts[0]) { break; }
          matchedContexts.shift();
        }

        resolveState = enterStates.shift();
        exitStates.shift();
      }
    }

    this.enterState(exitStates, enterStates, enterStates[enterStates.length-1] || resolveState);
    this.triggerSetupContext(enterStates, matchedContexts);
  },

  triggerSetupContext: function(enterStates, contexts) {
    var offset = enterStates.length - contexts.length;
    Ember.assert("More contexts provided than states", offset >= 0);

    arrayForEach.call(enterStates, function(state, idx) {
      state.trigger(get(this, 'transitionEvent'), this, contexts[idx-offset]);
    }, this);
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

  enterState: function(exitStates, enterStates, state) {
    var log = this.enableLogging,
        stateManager = this;

    exitStates = exitStates.slice(0).reverse();
    arrayForEach.call(exitStates, function(state) {
      state.trigger('exit', stateManager);
    });

    arrayForEach.call(enterStates, function(state) {
      if (log) { Ember.Logger.log("STATEMANAGER: Entering " + get(state, 'path')); }
      state.trigger('enter', stateManager);
    });

    set(this, 'currentState', state);
  }
});
