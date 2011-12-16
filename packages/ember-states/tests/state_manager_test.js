require('ember-states/state_manager');

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
    if (stateManager) {
      stateManager.destroy();
    }
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

  equals(loadingState.entered, 1, "state should receive one enter event");
  equals(loadingState.exited, 0, "state should not have received an exit event");
  equals(loadedState.entered, 0, "sibling state should not have received enter event");
  equals(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.goToState('loadedState');
  equals(loadingState.entered, 0, "state should not receive an enter event");
  equals(loadingState.exited, 1, "state should receive one exit event");
  equals(loadedState.entered, 1, "sibling state should receive one enter event");
  equals(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.goToState('loadingState');

  equals(loadingState.entered, 1, "state should receive one enter event");
  equals(loadingState.exited, 0, "state should not have received an exit event");
  equals(loadedState.entered, 0, "sibling state should not have received enter event");
  equals(loadedState.exited, 1, "sibling state should receive one exit event");
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
        equals(counter, 1, "increments counter and executes transition after specified timeout");
        start();
      },

      exit: function() {
        equals(arguments.length, 0, "does not pass transition object if arguments are empty");
      }
    })
  });

  stateManager.send('finish');
});

test("it accepts absolute paths when changing states", function() {
  var emptyState = loadedState.empty;

  stateManager.goToState('loadingState');

  stateManager.goToState('loadedState.empty');

  equals(emptyState.entered, 1, "sends enter event to substate");
  equals(emptyState.exited, 0, "does not send exit event to substate");
  ok(stateManager.get('currentState') === emptyState, "updates currentState property to state at absolute path");
});

test("it automatically transitions to a default state", function() {
  stateManager = Ember.StateManager.create({
    start: Ember.State.create({
      isStart: true
    })
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

test("it reports the view associated with the current view state, if any", function() {
  var view = Ember.View.create();

  stateManager = Ember.StateManager.create({
    foo: Ember.ViewState.create({
      view: view,
      bar: Ember.State.create()
    })
  });

  stateManager.goToState('foo.bar');

  equal(get(stateManager, 'currentView'), view, "returns nearest parent view state's view");
});

module("Ember.StateManager - Transitions on Complex State Managers");

/**
            SB
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
  equals(stateManager.login.entered, 1, "precond - it enters the login state");
  equals(stateManager.login.start.entered, 1, "automatically enters the start state");
  ok(stateManager.get('currentState') === stateManager.login.start, "automatically sets currentState to start state");

  stateManager.login.reset();
  stateManager.login.start.reset();

  stateManager.goToState('redeem');

  equals(stateManager.login.exited, 1, "login state is exited once");
  equals(stateManager.login.start.exited, 1, "start state is exited once");

  equals(stateManager.redeem.entered, 1, "redeemed state is entered once");
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
    context = null;
  }
});

test("it dispatches events to the current state", function() {
  stateManager.send('anEvent');

  equals(loadingEventCalled, 1, "event was triggered");
});

test("it dispatches events to a parent state if the child state does not respond to it", function() {
  stateManager.goToState('loaded.empty');
  stateManager.send('anEvent');

  equals(loadedEventCalled, 1, "parent state receives event");
});

test("it does not dispatch events to parents if the child responds to it", function() {
  stateManager.goToState('loaded.empty');
  stateManager.send('eventInChild');

  equals(eventInChildCalled, 1, "does not dispatch event to parent");
});

test("it supports arguments to events", function() {
  stateManager.send('anEvent', { context: true });
  equals(passedContext.context, true, "send passes along a context");
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
  equals(stateManager.grandparent.entered, 1, "the top level should be entered");
  equals(stateManager.grandparent.parent.entered, 1, "intermediate states should be entered");
  equals(stateManager.grandparent.parent.child.entered, 1, "the final state should be entered");

  stateManager.goToState('grandparent.parent.sibling');
  equals(stateManager.grandparent.entered, 1, "the top level should not be re-entered");
  equals(stateManager.grandparent.parent.entered, 1, "intermediate states should not be re-entered");
  equals(stateManager.grandparent.parent.child.entered, 1, "the final state should not be re-entered");

  equals(stateManager.grandparent.parent.child.exited, 1, "the child should have exited");
  equals(stateManager.grandparent.exited, 0, "the top level should not have have exited");
  equals(stateManager.grandparent.parent.exited, 0, "intermediate states should not have exited");
});
