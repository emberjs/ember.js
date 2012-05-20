var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

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

      managerA.getPath('currentState.name') // 'start'

      managerB = Ember.StateManager.create({
        initialState: 'beginHere',
        beginHere: Ember.State.create({})
      })

      managerB.getPath('currentState.name') // 'beginHere'

  Because it is a property you may also provided a computed function if you wish to derive
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

  Calling `goToState` transitions between states:

       robotManager = Ember.StateManager.create({
         initialState: 'poweredDown',
         poweredDown: Ember.State.create({}),
         poweredUp: Ember.State.create({})
       })

       robotManager.getPath('currentState.name') // 'poweredDown'
       robotManager.goToState('poweredUp')
       robotManager.getPath('currentState.name') // 'poweredUp'

  Before transitioning into a new state the existing `currentState` will have its
  `exit` method called with the StateManager instance as its first argument and 
  an object representing the transition as its second argument.

  After transitioning into a new state the new `currentState` will have its
  `enter` method called with the StateManager instance as its first argument and 
  an object representing the transition as its second argument.

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown',
        poweredDown: Ember.State.create({
          exit: function(stateManager, transition){
            console.log("exiting the poweredDown state")
          }
        }),
        poweredUp: Ember.State.create({
          enter: function(stateManager, transition){
            console.log("entering the poweredUp state. Destroy all humans.")
          }
        })
      })

      robotManager.getPath('currentState.name') // 'poweredDown'
      robotManager.goToState('poweredUp')
      // will log
      // 'exiting the poweredDown state'
      // 'entering the poweredUp state. Destroy all humans.'


  Once a StateManager is already in a state, subsequent attempts to enter that state will
  not trigger enter or exit method calls. Attempts to transition into a state that the 
  manager does not have will result in no changes in the StateManager's current state:

      robotManager = Ember.StateManager.create({
        initialState: 'poweredDown',
        poweredDown: Ember.State.create({
          exit: function(stateManager, transition){
            console.log("exiting the poweredDown state")
          }
        }),
        poweredUp: Ember.State.create({
          enter: function(stateManager, transition){
            console.log("entering the poweredUp state. Destroy all humans.")
          }
        })
      })

      robotManager.getPath('currentState.name') // 'poweredDown'
      robotManager.goToState('poweredUp')
      // will log
      // 'exiting the poweredDown state'
      // 'entering the poweredUp state. Destroy all humans.'
      robotManager.goToState('poweredUp') // no logging, no state change

      robotManager.goToState('someUnknownState') // silently fails
      robotManager.getPath('currentState.name') // 'poweredUp'


  Each state property may itself contain properties that are instances of Ember.State. 
  The StateManager can transition to specific sub-states in a series of goToState method calls or
  via a single goToState with the full path to the specific state. The StateManager will also 
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

       robotManager.getPath('currentState.name') // 'poweredDown'

       robotManager.goToState('poweredUp')
       robotManager.getPath('currentState.name') // 'poweredUp'

       robotManager.goToState('mobile')
       robotManager.getPath('currentState.name') // 'mobile'

       // transition via a state path
       robotManager.goToState('poweredDown.charging')
       robotManager.getPath('currentState.name') // 'charging'

       robotManager.getPath('currentState.get.path') // 'poweredDown.charging'

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


        robotManager.get('currentState.get.path') // 'poweredDown'
        robotManager.goToState('charged')
        // logs 'entered charged state'
        // but does *not* log  'exited poweredDown state'
        robotManager.getPath('currentState.name') // 'charged

        robotManager.goToState('poweredUp.mobile')
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

      managerA.getPath('currentState.name') // 'subsubstateOne'
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

        managerB.getPath('currentState.name') // 'subsubstateOne'
        managerB.send('anAction')
        // Error: <Ember.StateManager:ember132> could not
        // respond to event anAction in state stateOne.substateOne.subsubstateOne.

  Inside of an action method the given state should delegate `goToState` calls on its
  StateManager.

        robotManager = Ember.StateManager.create({
           initialState: 'poweredDown.charging',
           poweredDown: Ember.State.create({
             charging: Ember.State.create({
                chargeComplete: function(manager, context){
                  manager.goToState('charged')
                }
             }),
             charged: Ember.State.create({
               boot: function(manager, context){
                  manager.goToState('poweredUp')
               }
             })
           }),
           poweredUp: Ember.State.create({
             beginExtermination: function(manager, context){
                manager.goToState('rampaging')
             },
             rampaging: Ember.State.create()
           })
         })

         robotManager.getPath('currentState.name') // 'charging'
         robotManager.send('boot') // throws error, no boot action  
                                   // in current hierarchy
         robotManager.getPath('currentState.name') // remains 'charging'

         robotManager.send('beginExtermination') // throws error, no beginExtermination
                                                 // action in current hierarchy
         robotManager.getPath('currentState.name') // remains 'charging'

         robotManager.send('chargeComplete')
         robotManager.getPath('currentState.name') // 'charged'

         robotManager.send('boot')
         robotManager.getPath('currentState.name') // 'poweredUp'

         robotManager.send('beginExtermination', allHumans)
         robotManager.getPath('currentState.name') // 'rampaging'

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

    if (!initialState && getPath(this, 'states.start')) {
      initialState = 'start';
    }

    if (initialState) {
      this.goToState(initialState);
    }
  },

  currentState: null,

  /**
    If set to true, `errorOnUnhandledEvents` will cause an exception to be
    raised if you attempt to send an event to a state manager that is not
    handled by the current state or any of its parent states.

    @property {Boolean}
  */
  errorOnUnhandledEvent: true,

  send: function(event, context) {
    this.sendRecursively(event, get(this, 'currentState'), context);
  },

  sendRecursively: function(event, currentState, context) {
    var log = this.enableLogging;

    var action = currentState[event];

    // Test to see if the action is a method that
    // can be invoked. Don't blindly check just for
    // existence, because it is possible the state
    // manager has a child state of the given name,
    // and we should still raise an exception in that
    // case.
    if (typeof action === 'function') {
      if (log) { Ember.Logger.log(fmt("STATEMANAGER: Sending event '%@' to state %@.", [event, get(currentState, 'path')])); }
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

  goToState: function() {
    // not deprecating this yet so people don't constantly need to
    // make trivial changes for little reason.
    return this.transitionTo.apply(this, arguments);
  },

  pathForSegments: function(array) {
    return Ember.ArrayUtils.map(array, function(tuple) {
      Ember.assert("A segment passed to transitionTo must be an Array", Ember.typeOf(tuple) === "array");
      return tuple[0];
    }).join(".");
  },

  transitionTo: function(name, context) {
    // 1. Normalize arguments
    // 2. Ensure that we are in the correct state
    // 3. Map provided path to context objects and send
    //    appropriate setupControllers events

    if (Ember.empty(name)) { return; }

    var segments;

    if (Ember.typeOf(name) === "array") {
      segments = Array.prototype.slice.call(arguments);
    } else {
      segments = [[name, context]];
    }

    var path = this.pathForSegments(segments);

    var currentState = get(this, 'currentState') || this, state, newState;

    var exitStates = [], enterStates, resolveState;

    state = currentState;

    if (state.routes[path]) {
      // cache hit

      var route = state.routes[path];
      exitStates = route.exitStates;
      enterStates = route.enterStates;
      state = route.futureState;
      resolveState = route.resolveState;
    } else {
      // cache miss

      newState = this.findStatesByRoute(currentState, path);

      while (state && !newState) {
        exitStates.unshift(state);

        state = get(state, 'parentState');
        if (!state) {
          newState = this.findStatesByRoute(this, path);
          if (!newState) { return; }
        }
        newState = this.findStatesByRoute(state, path);
      }

      resolveState = state;

      enterStates = newState.slice(0);
      exitStates = exitStates.slice(0);

      if (enterStates.length > 0) {
        state = enterStates[enterStates.length - 1];

        while (enterStates.length > 0 && enterStates[0] === exitStates[0]) {
          enterStates.shift();
          exitStates.shift();
        }
      }

      currentState.routes[path] = {
        exitStates: exitStates,
        enterStates: enterStates,
        futureState: state,
        resolveState: resolveState
      };
    }

    this.enterState(exitStates, enterStates, state);
    this.triggerSetupContext(resolveState, segments);
  },

  triggerSetupContext: function(root, segments) {
    var state = root;

    Ember.ArrayUtils.forEach(segments, function(tuple) {
      var path = tuple[0], context = tuple[1];

      state = this.findStatesByRoute(state, path);
      state = state[state.length-1];

      state.fire('setupControllers', this, context);
    }, this);
    //getPath(root, path).setupControllers(this, context);
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
      state.fire('exit', stateManager, transition);
    }, function() {
      this.asyncEach(enterStates, function(state, transition) {
        if (log) { Ember.Logger.log("STATEMANAGER: Entering " + get(state, 'path')); }
        state.fire('enter', stateManager, transition);
      }, function() {
        var startState = state, enteredState, initialState;

        initialState = get(startState, 'initialState');

        if (!initialState) {
          initialState = 'start';
        }

        // right now, start states cannot be entered asynchronously
        while (startState = get(get(startState, 'states'), initialState)) {
          enteredState = startState;

          if (log) { Ember.Logger.log("STATEMANAGER: Entering " + get(startState, 'path')); }
          startState.fire('enter', stateManager);

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
