var get = Ember.get, set = Ember.set, getPath = Ember.getPath, setPath = Ember.setPath;

var stateManager, loadingState, loadedState, stateEventStub = {
  entered: 0,
  enter: function() {
    this.entered++;
  },

  exited: 0,
  exit: function() {
    this.exited++;
  },

  reset: function() {
    this.entered = 0;
    this.exited = 0;
  }
};

module("Ember.StateManager", {
  setup: function() {
    loadingState = Ember.State.create(stateEventStub);
    loadedState = Ember.State.create(stateEventStub, {
      empty: Ember.State.create(stateEventStub)
    });

    stateManager = Ember.StateManager.create({
      loadingState: loadingState,
      loadedState: loadedState
    });
  },

  teardown: function() {
    Ember.run(function() {
      if (stateManager) {
        stateManager.destroy();
      }
    });
  }
});

test("it exists", function() {
  ok(Ember.Object.detect(Ember.StateManager), "Ember.StateManager is an Ember.Object");
});

test("it discovers states set in its state property", function() {
  var states = {
    loading: Ember.State.create(),
    loaded: Ember.State.create()
  };

  stateManager = Ember.StateManager.create({
    states: states
  });

  equal(states, stateManager.get('states'), "reports same states as were set");
});

test("it discovers states that are properties of the state manager", function() {
  stateManager = Ember.StateManager.create({
    loading: Ember.State.create(),
    loaded: Ember.State.create()
  });

  var states = stateManager.get('states');
  ok(get(states, 'loading'), "found loading state");
  ok(get(states, 'loaded'), "found loaded state");
});

test("it reports its current state", function() {
  ok(get(stateManager, 'currentState') === null, "currentState defaults to null if no state is specified");

  stateManager.goToState('loadingState');
  ok(get(stateManager, 'currentState') === loadingState, "currentState changes after goToState() is called");

  stateManager.goToState('loadedState');
  ok(get(stateManager, 'currentState') === loadedState, "currentState can change to a sibling state");
});

test("it sends enter and exit events during state transitions", function() {
  stateManager.goToState('loadingState');

  equal(loadingState.entered, 1, "state should receive one enter event");
  equal(loadingState.exited, 0, "state should not have received an exit event");
  equal(loadedState.entered, 0, "sibling state should not have received enter event");
  equal(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.goToState('loadedState');
  equal(loadingState.entered, 0, "state should not receive an enter event");
  equal(loadingState.exited, 1, "state should receive one exit event");
  equal(loadedState.entered, 1, "sibling state should receive one enter event");
  equal(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.goToState('loadingState');

  equal(loadingState.entered, 1, "state should receive one enter event");
  equal(loadingState.exited, 0, "state should not have received an exit event");
  equal(loadedState.entered, 0, "sibling state should not have received enter event");
  equal(loadedState.exited, 1, "sibling state should receive one exit event");
});

test("a transition can be asynchronous", function() {
  expect(1);

  var counter = 0;
  var stateManager = Ember.StateManager.create({
    start: Ember.State.create({
      finish: function(manager) {
        manager.goToState('finished');
      },

      exit: function(manager, transition) {
        // pause QUnit while we test some async functionality
        stop();

        transition.async();

        setTimeout(function() {
          counter++;
          transition.resume();
        }, 50);
      }
    }),

    finished: Ember.State.create({
      enter: function() {
        equal(counter, 1, "increments counter and executes transition after specified timeout");
        start();
      },

      exit: function() {
        equal(arguments.length, 0, "does not pass transition object if arguments are empty");
      }
    })
  });

  stateManager.send('finish');
});

test("it accepts absolute paths when changing states", function() {
  var emptyState = loadedState.empty;

  stateManager.goToState('loadingState');

  stateManager.goToState('loadedState.empty');

  equal(emptyState.entered, 1, "sends enter event to substate");
  equal(emptyState.exited, 0, "does not send exit event to substate");
  ok(stateManager.get('currentState') === emptyState, "updates currentState property to state at absolute path");
});

test("it does not enter an infinite loop in goToState", function() {
  var emptyState = loadedState.empty;

  stateManager.goToState('loadedState.empty');

  stateManager.goToState('');
  ok(stateManager.get('currentState') === emptyState, "goToState does nothing when given empty name");

  stateManager.goToState('nonexistentState');
  ok(stateManager.get('currentState') === emptyState, "goToState does not infinite loop when given nonexistent State");
});

test("it automatically transitions to a default state", function() {
  stateManager = Ember.StateManager.create({
    start: Ember.State.create({
      isStart: true
    })
  });

  ok(get(stateManager, 'currentState').isStart, "automatically transitions to start state");
});

test("it automatically transitions to a default state that is an instance", function() {
  stateManager = Ember.StateManager.create({
    states: {
      foo: Ember.State.create({
        start: Ember.State.extend({
          isStart: true
        })
      })
    }
  });

  stateManager.goToState('foo');
  ok(get(stateManager, 'currentState').isStart, "automatically transitions to start state");
});

test("on a state manager, it automatically transitions to a default state that is an instance", function() {
  stateManager = Ember.StateManager.create({
    states: {
      start: Ember.State.extend({
        isStart: true
      })
    }
  });

  ok(get(stateManager, 'currentState').isStart, "automatically transitions to start state");
});

test("it automatically transitions to a default state specified using the initialState property", function() {
  stateManager = Ember.StateManager.create({
    initialState: 'beginning',

    beginning: Ember.State.create({
      isStart: true
    })
  });

  ok(get(stateManager, 'currentState').isStart, "automatically transitions to beginning state");
});

test("it automatically transitions to a default substate specified using the initialState property", function() {
  stateManager = Ember.StateManager.create({
    start: Ember.State.create({
      initialState: 'beginningSubstate',

      beginningSubstate: Ember.State.create({
        isStart: true
      })
    })
  });

  ok(get(stateManager, 'currentState').isStart, "automatically transitions to beginning substate");
});

test("it automatically transitions to multiple substates specified using either start or initialState property", function() {
  stateManager = Ember.StateManager.create({
    start: Ember.State.create({
      initialState: 'beginningSubstate',

      beginningSubstate: Ember.State.create({
        start: Ember.State.create({
          initialState: 'finalSubstate',

          finalSubstate: Ember.State.create({
            isStart: true
          })
        })
      })
    })
  });

  ok(get(stateManager, 'currentState').isStart, "automatically transitions to final substate");
});

module("Ember.StateManager - Transitions on Complex State Managers");

/**
            SM
          /    \
     Login      Redeem
    /    |        |    \
  Start  Pending Start  Pending

  * Transition from Login.Start to Redeem
    - Login.Start and Login should receive exit events
    - Redeem should receiver enter event
*/

test("it sends exit events to nested states when changing to a top-level state", function() {
  var stateManager = Ember.StateManager.create({
    login: Ember.State.create(stateEventStub, {
      start: Ember.State.create(stateEventStub),
      pending: Ember.State.create(stateEventStub)
    }),

    redeem: Ember.State.create(stateEventStub, {
      isRedeem: true,
      start: Ember.State.create(),
      pending: Ember.State.create()
    })
  });

  stateManager.goToState('login');
  equal(stateManager.login.entered, 1, "precond - it enters the login state");
  equal(stateManager.login.start.entered, 1, "automatically enters the start state");
  ok(stateManager.get('currentState') === stateManager.login.start, "automatically sets currentState to start state");

  stateManager.login.reset();
  stateManager.login.start.reset();

  stateManager.goToState('redeem');

  equal(stateManager.login.exited, 1, "login state is exited once");
  equal(stateManager.login.start.exited, 1, "start state is exited once");

  equal(stateManager.redeem.entered, 1, "redeemed state is entered once");
});

test("it sends exit events in the correct order when changing to a top-level state", function() {
  var exitOrder = [],
      stateManager = Ember.StateManager.create({
        start: Ember.State.create({
          outer: Ember.State.create({
            inner: Ember.State.create({
              exit: function() { exitOrder.push('exitedInner'); }
            }),
            exit: function() { exitOrder.push('exitedOuter'); }
          })
        })
      });

  stateManager.goToState('start.outer.inner');
  stateManager.goToState('start');
  equal(exitOrder.length, 2, "precond - it calls both exits");
  equal(exitOrder[0], 'exitedInner', "inner exit is called first");
  equal(exitOrder[1], 'exitedOuter', "outer exit is called second");
});

test("it sends exit events in the correct order when changing to a state multiple times", function() {
  var exitOrder = [],
      stateManager = Ember.StateManager.create({
        start: Ember.State.create({
          outer: Ember.State.create({
            inner: Ember.State.create({
              exit: function() { exitOrder.push('exitedInner'); }
            }),
            exit: function() { exitOrder.push('exitedOuter'); }
          })
        })
      });

  stateManager.goToState('start.outer.inner');
  stateManager.goToState('start');
  stateManager.goToState('start.outer.inner');
  exitOrder = [];
  stateManager.goToState('start');
  equal(exitOrder.length, 2, "precond - it calls both exits");
  equal(exitOrder[0], 'exitedInner', "inner exit is called first");
  equal(exitOrder[1], 'exitedOuter', "outer exit is called second");
});

var passedContext, loadingEventCalled, loadedEventCalled, eventInChildCalled;
loadingEventCalled = loadedEventCalled = eventInChildCalled = 0;

module("Ember.StateManager - Event Dispatching", {
  setup: function() {
    stateManager = Ember.StateManager.create({
      loading: Ember.State.create({
        anEvent: function(manager, context) {
          loadingEventCalled++;
          passedContext = context;
        }
      }),

      loaded: Ember.State.create({
        anEvent: function() {
          loadedEventCalled++;
        },

        eventInChild: function() {
          eventInChildCalled++;
        },

        empty: Ember.State.create({
          eventInChild: function() {
            eventInChildCalled++;
          }
        })
      })
    });

    stateManager.goToState('loading');
  }
});

test("it dispatches events to the current state", function() {
  stateManager.send('anEvent');

  equal(loadingEventCalled, 1, "event was triggered");
});

test("it dispatches events to a parent state if the child state does not respond to it", function() {
  stateManager.goToState('loaded.empty');
  stateManager.send('anEvent');

  equal(loadedEventCalled, 1, "parent state receives event");
});

test("it does not dispatch events to parents if the child responds to it", function() {
  stateManager.goToState('loaded.empty');
  stateManager.send('eventInChild');

  equal(eventInChildCalled, 1, "does not dispatch event to parent");
});

test("it supports arguments to events", function() {
  stateManager.send('anEvent', { context: true });
  equal(passedContext.context, true, "send passes along a context");
});

test("it throws an exception if an event is dispatched that is unhandled", function() {
  raises(function() {
    stateManager.send('unhandledEvent');
  }, Error, "exception was raised");

  stateManager = Ember.StateManager.create({
    initialState: 'loading',
    errorOnUnhandledEvent: false,
    loading: Ember.State.create({
      anEvent: function() {}
    })
  });

  stateManager.send('unhandledEvent');
  ok(true, "does not raise exception when errorOnUnhandledEvent is set to false");
});

module("Ember.Statemanager - Pivot states", {
  setup: function() {
    var State = Ember.State.extend(stateEventStub);

    stateManager = Ember.StateManager.create(stateEventStub, {
      grandparent: State.create({
        parent: State.create({
          child: State.create(),
          sibling: State.create()
        }),
        cousin: State.create()
      })
    });
  }
});

test("goToState triggers all enter states", function() {
  stateManager.goToState('grandparent.parent.child');
  equal(stateManager.grandparent.entered, 1, "the top level should be entered");
  equal(stateManager.grandparent.parent.entered, 1, "intermediate states should be entered");
  equal(stateManager.grandparent.parent.child.entered, 1, "the final state should be entered");

  stateManager.goToState('grandparent.parent.sibling');
  equal(stateManager.grandparent.entered, 1, "the top level should not be re-entered");
  equal(stateManager.grandparent.parent.entered, 1, "intermediate states should not be re-entered");
  equal(stateManager.grandparent.parent.child.entered, 1, "the final state should not be re-entered");

  equal(stateManager.grandparent.parent.child.exited, 1, "the child should have exited");
  equal(stateManager.grandparent.exited, 0, "the top level should not have have exited");
  equal(stateManager.grandparent.parent.exited, 0, "intermediate states should not have exited");
});

test("goToState with current state does not trigger enter or exit", function() {
  stateManager.goToState('grandparent.parent.child');
  stateManager.goToState('grandparent.parent.child');
  equal(stateManager.grandparent.entered, 1, "the top level should only be entered once");
  equal(stateManager.grandparent.parent.entered, 1, "intermediate states should only be entered once");
  equal(stateManager.grandparent.parent.child.entered, 1, "the final state should only be entered once");
  equal(stateManager.grandparent.parent.child.exited, 0, "the final state should not be exited");
});

module("Transition contexts");

test("if a context is passed to a transition, the state's setupControllers event is triggered after the transition has completed", function() {
  expect(1);
  var context = {};

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        goNext: function(manager, context) {
          manager.goToState('next', context);
        }
      }),

      next: Ember.State.create({
        setupControllers: function(manager, passedContext) {
          equal(context, passedContext, "The context is passed through");
        }
      })
    });
  });

  stateManager.send('goNext', context);
});

test("if a context is passed to a transition and the path is to the current state, the state's setupControllers event is triggered again", function() {
  expect(2);
  var counter = 0;

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        goNext: function(manager, context) {
          counter++;
          manager.goToState('foo.next', counter);
        }
      }),

      foo: Ember.State.create({
        next: Ember.State.create({
          goNext: function(manager, context) {
            counter++;
            manager.goToState('next', counter);
          },

          setupControllers: function(manager, context) {
            equal(context, counter, "The context is passed through");
          }
        })
      })
    });
  });

  stateManager.send('goNext', counter);
  stateManager.send('goNext', counter);
});

test("if no context is provided, setupControllers is triggered with an undefined context", function() {
  expect(2);

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        goNext: function(manager) {
          manager.transitionTo('foo.next');
        }
      }),

      foo: Ember.State.create({
        next: Ember.State.create({
          goNext: function(manager, context) {
            manager.transitionTo('next');
          },

          setupControllers: function(manager, context) {
            equal(context, undefined, "setupControllers is called with no context");
          }
        })
      })
    });
  });

  stateManager.send('goNext');
  stateManager.send('goNext');
});

test("multiple contexts can be provided in a single transitionTo", function() {
  expect(2);

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        goNuts: function(manager, context) {
          manager.goToState('foo.next', context);
        }
      }),

      planters: Ember.State.create({
        setupControllers: function(manager, context) {
          deepEqual(context, { company: true });
        },

        nuts: Ember.State.create({
          setupControllers: function(manager, context) {
            deepEqual(context, { product: true });
          }
        })
      })
    });
  });

  stateManager.transitionTo(['planters', { company: true }], ['nuts', { product: true }]);
});
