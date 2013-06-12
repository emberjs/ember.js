var get = Ember.get, set = Ember.set;

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

  stateManager.transitionTo('loadingState');
  ok(get(stateManager, 'currentState') === loadingState, "currentState changes after transitionTo() is called");

  stateManager.transitionTo('loadedState');
  ok(get(stateManager, 'currentState') === loadedState, "currentState can change to a sibling state");
});

test("it reports its current state path", function() {
  strictEqual(get(stateManager, 'currentPath'), null, "currentPath defaults to null if no state is specified");

  stateManager.transitionTo('loadingState');
  equal(get(stateManager, 'currentPath'), 'loadingState', "currentPath changes after transitionTo() is called");

  stateManager.transitionTo('loadedState');
  equal(get(stateManager, 'currentPath'), 'loadedState', "currentPath can change to a sibling state");
});

test("it sends enter and exit events during state transitions", function() {
  stateManager.transitionTo('loadingState');

  equal(loadingState.entered, 1, "state should receive one enter event");
  equal(loadingState.exited, 0, "state should not have received an exit event");
  equal(loadedState.entered, 0, "sibling state should not have received enter event");
  equal(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.transitionTo('loadedState');
  equal(loadingState.entered, 0, "state should not receive an enter event");
  equal(loadingState.exited, 1, "state should receive one exit event");
  equal(loadedState.entered, 1, "sibling state should receive one enter event");
  equal(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.transitionTo('loadingState');

  equal(loadingState.entered, 1, "state should receive one enter event");
  equal(loadingState.exited, 0, "state should not have received an exit event");
  equal(loadedState.entered, 0, "sibling state should not have received enter event");
  equal(loadedState.exited, 1, "sibling state should receive one exit event");
});

test("it accepts absolute paths when changing states", function() {
  var emptyState = loadedState.empty;

  stateManager.transitionTo('loadingState');

  stateManager.transitionTo('loadedState.empty');

  equal(emptyState.entered, 1, "sends enter event to substate");
  equal(emptyState.exited, 0, "does not send exit event to substate");
  ok(stateManager.get('currentState') === emptyState, "updates currentState property to state at absolute path");
});

test("it does not enter an infinite loop in transitionTo", function() {
  var emptyState = loadedState.empty;

  stateManager.transitionTo('loadedState.empty');

  stateManager.transitionTo('');
  ok(stateManager.get('currentState') === emptyState, "transitionTo does nothing when given empty name");

  expectAssertion(function() {
    stateManager.transitionTo('nonexistentState');
  }, 'Could not find state for path: "nonexistentState"');

  ok(stateManager.get('currentState') === emptyState, "transitionTo does not infinite loop when given nonexistent State");
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

  stateManager.transitionTo('foo');
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

test("it automatically synchronously transitions into initialState in an event", function() {
  var count = 0;

  stateManager = Ember.StateManager.create({
    root: Ember.State.create({
      original: Ember.State.create({
        zomgAnEvent: function(manager) {
          manager.transitionTo('nextState');
          manager.send('zomgAnotherEvent');
        }
      }),

      nextState: Ember.State.create({
        initialState: 'begin',

        begin: Ember.State.create({
          zomgAnotherEvent: function(manager) {
            count++;
          }
        })
      })
    })
  });

  Ember.run(function() {
    stateManager.transitionTo('root.original');
  });

  Ember.run(function() {
    stateManager.send('zomgAnEvent');
    equal(count, 1, "the initialState was synchronously effective");
  });
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

test("it triggers setup on initialSubstate", function() {
  var parentSetup = false,
      childSetup = false,
      grandchildSetup = false;

  stateManager = Ember.StateManager.create({
    start: Ember.State.create({
      setup: function() { parentSetup = true; },

      initialState: 'childState',

      childState: Ember.State.create({
        setup: function() { childSetup = true; },

        initialState: 'grandchildState',

        grandchildState: Ember.State.create({
          setup: function() { grandchildSetup = true; }
        })
      })
    })
  });

  ok(parentSetup, "sets up parent");
  ok(childSetup, "sets up child");
  ok(grandchildSetup, "sets up grandchild");
});

test("it throws an assertion error when the initialState does not exist", function() {
  expectAssertion(function() {
    Ember.StateManager.create({
      initialState: 'foo',
      bar: Ember.State.create()
    });
  });
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

  stateManager.transitionTo('login');
  equal(stateManager.login.entered, 1, "precond - it enters the login state");
  equal(stateManager.login.start.entered, 1, "automatically enters the start state");
  ok(stateManager.get('currentState') === stateManager.login.start, "automatically sets currentState to start state");

  stateManager.login.reset();
  stateManager.login.start.reset();

  stateManager.transitionTo('redeem');

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

  stateManager.transitionTo('start.outer.inner');
  stateManager.transitionTo('start');
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

  stateManager.transitionTo('start.outer.inner');
  stateManager.transitionTo('start');
  stateManager.transitionTo('start.outer.inner');
  exitOrder = [];
  stateManager.transitionTo('start');
  equal(exitOrder.length, 2, "precond - it calls both exits");
  equal(exitOrder[0], 'exitedInner', "inner exit is called first");
  equal(exitOrder[1], 'exitedOuter', "outer exit is called second");
});

var passedContext, passedContexts, loadingEventCalled, loadedEventCalled, eventInChildCalled;
loadingEventCalled = loadedEventCalled = eventInChildCalled = 0;

module("Ember.StateManager - Event Dispatching", {
  setup: function() {
    stateManager = Ember.StateManager.create({
      loading: Ember.State.create({
        anEvent: function(manager, context) {
          loadingEventCalled++;
          passedContext = context;
          passedContexts = [].slice.call(arguments, 1);
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

    stateManager.transitionTo('loading');
  }
});

test("it dispatches events to the current state", function() {
  stateManager.send('anEvent');

  equal(loadingEventCalled, 1, "event was triggered");
});

test("it dispatches events to a parent state if the child state does not respond to it", function() {
  stateManager.transitionTo('loaded.empty');
  stateManager.send('anEvent');

  equal(loadedEventCalled, 1, "parent state receives event");
});

test("it does not dispatch events to parents if the child responds to it", function() {
  stateManager.transitionTo('loaded.empty');
  stateManager.send('eventInChild');

  equal(eventInChildCalled, 1, "does not dispatch event to parent");
});

test("it supports arguments to events", function() {
  stateManager.send('anEvent', { context: true });
  equal(passedContext.context, true, "send passes along a context");
});

test("it supports multiple arguments to events", function() {
  stateManager.send('anEvent', {name: 'bestie'}, {name: 'crofty'});
  equal(passedContexts[0].name, 'bestie', "send passes along the first context");
  equal(passedContexts[1].name, 'crofty', "send passes along the second context");
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

test("it looks for unhandledEvent handler in the currentState if event is not handled by named handler", function() {
  var wasCalled = 0,
      evt = "foo",
      calledWithOriginalEventName,
      calledWithEvent;
  stateManager = Ember.StateManager.create({
    initialState: 'loading',
    loading: Ember.State.create({
      unhandledEvent: function(manager, originalEventName, event) {
        wasCalled = true;
        calledWithOriginalEventName = originalEventName;
        calledWithEvent = event;
      }
    })
  });
  stateManager.send("somethingUnhandled", evt);
  ok(wasCalled);
  equal(calledWithOriginalEventName, 'somethingUnhandled');
  equal(calledWithEvent, evt);
});

test("it looks for unhandledEvent handler in the stateManager if event is not handled by named handler", function() {
  var wasCalled = 0,
      evt = "foo",
      calledWithOriginalEventName,
      calledWithEvent;
  stateManager = Ember.StateManager.create({
    initialState: 'loading',
    unhandledEvent: function(manager, originalEventName, event) {
      wasCalled = true;
      calledWithOriginalEventName = originalEventName;
      calledWithEvent = event;
    },
    loading: Ember.State.create({})
  });
  stateManager.send("somethingUnhandled", evt);
  ok(wasCalled);
  equal(calledWithOriginalEventName, 'somethingUnhandled');
  equal(calledWithEvent, evt);
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

test("transitionTo triggers all enter states", function() {
  stateManager.transitionTo('grandparent.parent.child');
  equal(stateManager.grandparent.entered, 1, "the top level should be entered");
  equal(stateManager.grandparent.parent.entered, 1, "intermediate states should be entered");
  equal(stateManager.grandparent.parent.child.entered, 1, "the final state should be entered");

  stateManager.transitionTo('grandparent.parent.sibling');
  equal(stateManager.grandparent.entered, 1, "the top level should not be re-entered");
  equal(stateManager.grandparent.parent.entered, 1, "intermediate states should not be re-entered");
  equal(stateManager.grandparent.parent.child.entered, 1, "the final state should not be re-entered");

  equal(stateManager.grandparent.parent.child.exited, 1, "the child should have exited");
  equal(stateManager.grandparent.exited, 0, "the top level should not have have exited");
  equal(stateManager.grandparent.parent.exited, 0, "intermediate states should not have exited");
});

test("transitionTo with current state does not trigger enter or exit", function() {
  stateManager.transitionTo('grandparent.parent.child');
  stateManager.transitionTo('grandparent.parent.child');
  equal(stateManager.grandparent.entered, 1, "the top level should only be entered once");
  equal(stateManager.grandparent.parent.entered, 1, "intermediate states should only be entered once");
  equal(stateManager.grandparent.parent.child.entered, 1, "the final state should only be entered once");
  equal(stateManager.grandparent.parent.child.exited, 0, "the final state should not be exited");
});

module("Transition contexts");

test("if a context is passed to a transition, the state's setup event is triggered after the transition has completed", function() {
  expect(1);
  var context = {};

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        goNext: function(manager, context) {
          manager.transitionTo('next', context);
        }
      }),

      next: Ember.State.create({
        setup: function(manager, passedContext) {
          equal(context, passedContext, "The context is passed through");
        }
      })
    });
  });

  stateManager.send('goNext', context);
});

test("if a context is passed to a transition and the path is to the current state, the state's setup event is triggered again", function() {
  expect(2);
  var counter = 0;

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        goNext: function(manager, context) {
          counter++;
          manager.transitionTo('foo.next', counter);
        }
      }),

      foo: Ember.State.create({
        next: Ember.State.create({
          goNext: function(manager, context) {
            counter++;
            manager.transitionTo('next', counter);
          },

          setup: function(manager, context) {
            equal(context, counter, "The context is passed through");
          }
        })
      })
    });
  });

  stateManager.send('goNext', counter);
  stateManager.send('goNext', counter);
});

test("if no context is provided, setup is triggered with an undefined context", function() {
  expect(1);

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        goNext: function(manager) {
          manager.transitionTo('next');
        },

        next: Ember.State.create({
          setup: function(manager, context) {
            equal(context, undefined, "setup is called with no context");
          }
        })
      })
    });
  });

  stateManager.send('goNext');
});

test("multiple contexts can be provided in a single transitionTo", function() {
  expect(2);

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create(),

      planters: Ember.State.create({
        setup: function(manager, context) {
          deepEqual(context, { company: true });
        },

        nuts: Ember.State.create({
          setup: function(manager, context) {
            deepEqual(context, { product: true });
          }
        })
      })
    });
  });

  stateManager.transitionTo('planters.nuts', { company: true }, { product: true });
});

test("multiple contexts only apply to states that need them", function() {
  expect(4);

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create(),

      parent: Ember.State.create({
        hasContext: false,

        setup: function(manager, context) {
          equal(context, undefined);
        },

        child: Ember.State.create({
          setup: function(manager, context) {
            equal(context, 'one');
          },

          grandchild: Ember.State.create({
            initialState: 'greatGrandchild',

            setup: function(manager, context) {
              equal(context, 'two');
            },

            greatGrandchild: Ember.State.create({
              setup: function(manager, context) {
                equal(context, undefined);
              }
            })
          })
        })
      })
    });
  });

  stateManager.transitionTo('parent.child.grandchild', 'one', 'two');
});

test("transitionEvent is called for each nested state", function() {
  expect(4);

  var calledOnParent = false,
      calledOnChild = true;

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create(),

      planters: Ember.State.create({
        setup: function(manager, context) {
          calledOnParent = true;
        },

        nuts: Ember.State.create({
          setup: function(manager, context) {
            calledOnChild = true;
          }
        })
      })
    });
  });

  stateManager.transitionTo('planters.nuts');

  ok(calledOnParent, 'called transitionEvent on parent');
  ok(calledOnChild, 'called transitionEvent on child');

  // repeat the test now that the path is cached

  stateManager.transitionTo('start');

  calledOnParent = false;
  calledOnChild = false;

  stateManager.transitionTo('planters.nuts');

  ok(calledOnParent, 'called transitionEvent on parent');
  ok(calledOnChild, 'called transitionEvent on child');
});

test("transitionEvent is called for each nested state with context", function() {
  expect(8);

  var calledOnParent = false,
      calledOnChild = true;

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create(),

      planters: Ember.State.create({
        setup: function(manager, context) {
          calledOnParent = true;
          ok(!context, 'single context is not called on parent');
        },

        nuts: Ember.State.create({
          setup: function(manager, context) {
            calledOnChild = true;
            equal(context, 'context', 'child gets context');
          }
        })
      })
    });
  });

  stateManager.transitionTo('planters.nuts', 'context');

  ok(calledOnParent, 'called transitionEvent on parent');
  ok(calledOnChild, 'called transitionEvent on child');

  // repeat the test now that the path is cached

  stateManager.transitionTo('start');

  calledOnParent = false;
  calledOnChild = false;

  stateManager.transitionTo('planters.nuts', 'context');

  ok(calledOnParent, 'called transitionEvent on parent');
  ok(calledOnChild, 'called transitionEvent on child');
});

test("nothing happens if transitioning to a parent state when the current state is also the initial state", function() {
  var calledOnParent = 0,
      calledOnChild = 0;

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: Ember.State.create({
        initialState: 'first',

        setup: function() {
          calledOnParent++;
        },

        first: Ember.State.create({
          setup: function() {
            calledOnChild++;
          }
        })
      })
    });
  });

  equal(calledOnParent, 1, 'precond - setup parent');
  equal(calledOnChild, 1, 'precond - setup child');
  equal(stateManager.get('currentState.path'), 'start.first', 'precond - is in expected state');

  stateManager.transitionTo('start');

  equal(calledOnParent, 1, 'does not transition to parent again');
  equal(calledOnChild, 1, 'does not transition to child again');
  equal(stateManager.get('currentState.path'), 'start.first', 'does not change state');

});

test("StateManagers can use `create`d states from mixins", function() {
  var statesMixin,
    firstManagerClass, secondManagerClass,
    firstManager, secondManager,
    firstCount = 0, secondCount = 0;

  statesMixin = Ember.Mixin.create({
    initialState: 'ready',
    ready: Ember.State.create({
      startUpload: function(manager) {
        manager.transitionTo('uploading');
      }
    })
  });

  firstManagerClass = Ember.StateManager.extend(statesMixin, {
    uploading: Ember.State.create({
      enter: function() { firstCount++; }
    })
  });

  secondManagerClass = Ember.StateManager.extend(statesMixin, {
    uploading: Ember.State.create({
      enter: function() { secondCount++; }
    })
  });

  firstManager  = firstManagerClass.create();
  firstManager.send('startUpload');

  secondManager = secondManagerClass.create();
  secondManager.send('startUpload');

  equal(firstCount, 1, "The first state manager's uploading state was entered once");
  equal(secondCount, 1, "The second state manager's uploading state was entered once");
});

