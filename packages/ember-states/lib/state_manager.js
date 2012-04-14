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
        active: Ember.State.create({})
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
  `exit` method called with with the StateManager instance as its first argument and 
  an object representing the the transition as its second argument.

  After transitioning into a new state the new `currentState` will have its
  `enter` method called with with the StateManager instance as its first argument and 
  an object representing the the transition as its second argument.

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


  ## Interactions with Ember's View System.
  When combined with instances of `Ember.ViewState`, StateManager is designed to 
  interact with Ember's view system to control which views are added to 
  and removed from the DOM based on the manager's current state.

  By default, a StateManager will manage views inside the 'body' element. This can be
  customized by setting the `rootElement` property to a CSS selector of an existing 
  HTML element you would prefer to receive view rendering.


      viewStates = Ember.StateManager.create({
        rootElement: '#some-other-element'
      })

  You can also specify a particular instance of `Ember.ContainerView` you would like to receive
  view rendering by setting the `rootView` property. You will be responsible for placing
  this element into the DOM yourself.

      aLayoutView = Ember.ContainerView.create()

      // make sure this view instance is added to the browser
      aLayoutView.appendTo('body') 

      App.viewStates = Ember.StateManager.create({
        rootView: aLayoutView
      })


  Once you have an instance of StateManager controlling a view, you can provide states
  that are instances of `Ember.ViewState`.  When the StateManager enters a state
  that is an instance of `Ember.ViewState` that `ViewState`'s `view` property will be
  instantiated and inserted into the StateManager's `rootView` or `rootElement`.
  When a state is exited, the `ViewState`'s view will be removed from the StateManager's
  view.

      ContactListView = Ember.View.extend({
        classNames: ['my-contacts-css-class'],
        defaultTemplate: Ember.Handlebars.compile('<h2>People</h2>')
      })

      PhotoListView = Ember.View.extend({
        classNames: ['my-photos-css-class'],
        defaultTemplate: Ember.Handlebars.compile('<h2>Photos</h2>')
      })

      viewStates = Ember.StateManager.create({
        showingPeople: Ember.ViewState.create({
          view: ContactListView
        }),
        showingPhotos: Ember.ViewState.create({
          view: PhotoListView
        })
      })

      viewStates.goToState('showingPeople')

  The above code will change the rendered HTML from

      <body></body>

  to

      <body>
        <div id="ember1" class="ember-view my-contacts-css-class">
          <h2>People</h2>
        </div>
      </body>

  Changing the current state via `goToState` from `showingPeople` to
  `showingPhotos` will remove the `showingPeople` view and add the `showingPhotos` view:

      viewStates.goToState('showingPhotos')

  will change the rendered HTML to

      <body>
        <div id="ember2" class="ember-view my-photos-css-class">
          <h2>Photos</h2>
        </div>
      </body>


  When entering nested `ViewState`s, each state's view will be draw into the the StateManager's
  `rootView` or `rootElement` as siblings.


      ContactListView = Ember.View.extend({
        classNames: ['my-contacts-css-class'],
        defaultTemplate: Ember.Handlebars.compile('<h2>People</h2>')
      })

      EditAContactView = Ember.View.extend({
        classNames: ['editing-a-contact-css-class'],
        defaultTemplate: Ember.Handlebars.compile('Editing...')
      })

      viewStates = Ember.StateManager.create({
        showingPeople: Ember.ViewState.create({
          view: ContactListView,

          withEditingPanel: Ember.ViewState.create({
            view: EditAContactView
          })
        })
      })


      viewStates.goToState('showingPeople.withEditingPanel')


  Will result in the following rendered HTML:

      <body>
        <div id="ember2" class="ember-view my-contacts-css-class">
          <h2>People</h2>
        </div>

        <div id="ember2" class="ember-view editing-a-contact-css-class">
          Editing...
        </div>
      </body>


  ViewState views are added and removed from their StateManager's view via their
  `enter` and `exit` methods. If you need to override these methods, be sure to call
  `_super` to maintain the adding and removing behavior:

      viewStates = Ember.StateManager.create({
        aState: Ember.ViewState.create({
          view: Ember.View.extend({}),
          enter: function(manager, transition){
            // calling _super ensures this view will be
            // properly inserted
            this._super();

            // now you can do other things
          }
        })
      })

  ## Managing Multiple Sections of A Page With States
  Multiple StateManagers can be combined to control multiple areas of an application's rendered views.
  Given the following HTML body:

      <body>
        <div id='sidebar-nav'>
        </div>
        <div id='content-area'>
        </div>
      </body>

  You could separately manage view state for each section with two StateManagers

      navigationStates = Ember.StateManager.create({
        rootElement: '#sidebar-nav',
        userAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        userNotAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })

      contentStates = Ember.StateManager.create({
        rootElement: '#content-area',
        books: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        music: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })


  If you prefer to start with an empty body and manage state programmatically you
  can also take advantage of StateManager's `rootView` property and the ability of 
  `Ember.ContainerView`s to manually manage their child views. 


      dashboard = Ember.ContainerView.create({
        childViews: ['navigationAreaView', 'contentAreaView'],
        navigationAreaView: Ember.ContainerView.create({}),
        contentAreaView: Ember.ContainerView.create({})
      })

      navigationStates = Ember.StateManager.create({
        rootView: dashboard.get('navigationAreaView'),
        userAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        userNotAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })

      contentStates = Ember.StateManager.create({
        rootView: dashboard.get('contentAreaView'),
        books: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        music: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })

      dashboard.appendTo('body')

  ## User Manipulation of State via `{{action}}` Helpers
  The Handlebars `{{action}}` helper is StateManager-aware and will use StateManager action sending 
  to connect user interaction to action-based state transitions.

  Given the following body and handlebars template

      <body>
        <script type='text/x-handlebars'>
          <a href="#" {{action "anAction" target="App.appStates"}}> Go </a>
        </script>
      </body>

  And application code

      App = Ember.Application.create()
      App.appStates = Ember.StateManager.create({
        initialState: 'aState',
        aState: Ember.State.create({
          anAction: function(manager, context){}
        }),
        bState: Ember.State.create({})
      })

  A user initiated click or touch event on "Go" will trigger the 'anAction' method of
  `App.appStates.aState` with `App.appStates` as the first argument and a
  `jQuery.Event` object as the second object. The `jQuery.Event` will include a property
  `view` that references the `Ember.View` object that was interacted with.
  
**/
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
