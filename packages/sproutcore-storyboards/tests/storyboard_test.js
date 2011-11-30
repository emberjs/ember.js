require('sproutcore-storyboards/storyboard');

var get = SC.get, set = SC.set, getPath = SC.getPath, setPath = SC.setPath;

var storyboard, loadingState, loadedState, stateEventStub = {
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

module("SC.Storyboard", {
  setup: function() {
    loadingState = SC.State.create(stateEventStub);
    loadedState = SC.State.create(stateEventStub, {
      empty: SC.State.create(stateEventStub)
    });

    storyboard = SC.Storyboard.create({
      loadingState: loadingState,
      loadedState: loadedState
    });
  },

  teardown: function() {
    if (storyboard) {
      storyboard.destroy();
    }
  }
});

test("it exists", function() {
  ok(SC.Object.detect(SC.Storyboard), "SC.Storyboard is an SC.Object");
});

test("it reports its current state", function() {
  ok(get(storyboard, 'currentState') === null, "currentState defaults to null if no state is specified");

  storyboard.goToState('loadingState');
  ok(get(storyboard, 'currentState') === loadingState, "currentState changes after goToState() is called");

  storyboard.goToState('loadedState');
  ok(get(storyboard, 'currentState') === loadedState, "currentState can change to a sibling state");
});

test("it sends enter and exit events during state transitions", function() {
  storyboard.goToState('loadingState');

  equals(loadingState.entered, 1, "state should receive one enter event");
  equals(loadingState.exited, 0, "state should not have received an exit event");
  equals(loadedState.entered, 0, "sibling state should not have received enter event");
  equals(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  storyboard.goToState('loadedState');
  equals(loadingState.entered, 0, "state should receive one enter event");
  equals(loadingState.exited, 1, "state should not have received an exit event");
  equals(loadedState.entered, 1, "sibling state should not have received enter event");
  equals(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  storyboard.goToState('loadingState');

  equals(loadingState.entered, 1, "state should receive one enter event");
  equals(loadingState.exited, 0, "state should not have received an exit event");
  equals(loadedState.entered, 0, "sibling state should not have received enter event");
  equals(loadedState.exited, 1, "sibling state should not have received exited event");
});

test("it accepts absolute paths when changing states", function() {
  var emptyState = loadedState.empty;

  storyboard.goToState('loadingState');

  storyboard.goToState('loadedState.empty');

  equals(emptyState.entered, 1, "sends enter event to substate");
  equals(emptyState.exited, 0, "does not send exit event to substate");
  ok(storyboard.get('currentState') === emptyState, "updates currentState property to state at absolute path");
});

test("it automatically transitions to a default state", function() {
  storyboard = SC.Storyboard.create({
    start: SC.State.create({
      isStart: true
    })
  });

  ok(get(storyboard, 'currentState').isStart, "automatically transitions to start state");
});

test("it automatically transitions to a default state specified using the initialState property", function() {
  storyboard = SC.Storyboard.create({
    initialState: 'beginning',

    beginning: SC.State.create({
      isStart: true
    })
  });

  ok(get(storyboard, 'currentState').isStart, "automatically transitions to beginning state");
});

module("SC.Storyboard - Transitions on Complex Storyboards");

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
  var storyboard = SC.Storyboard.create({
    login: SC.State.create(stateEventStub, {
      start: SC.State.create(stateEventStub),
      pending: SC.State.create(stateEventStub)
    }),

    redeem: SC.State.create(stateEventStub, {
      isRedeem: true,
      start: SC.State.create(),
      pending: SC.State.create()
    })
  });

  storyboard.goToState('login');
  equals(storyboard.login.entered, 1, "precond - it enters the login state");
  equals(storyboard.login.start.entered, 1, "automatically enters the start state");
  ok(storyboard.get('currentState') === storyboard.login.start, "automatically sets currentState to start state");

  storyboard.login.reset();
  storyboard.login.start.reset();

  storyboard.goToState('redeem');

  equals(storyboard.login.exited, 1, "login state is exited once");
  equals(storyboard.login.start.exited, 1, "start state is exited once");

  equals(storyboard.redeem.entered, 1, "redeemed state is entered once");
});

var storyboard, passedContext, loadingEventCalled, loadedEventCalled, eventInChildCalled;
loadingEventCalled = loadedEventCalled = eventInChildCalled = 0;

module("SC.Storyboard - Event Dispatching", {
  setup: function() {
    storyboard = SC.Storyboard.create({
      loading: SC.State.create({
        anEvent: function(context) {
          loadingEventCalled++;
          passedContext = context;
        }
      }),

      loaded: SC.State.create({
        anEvent: function() {
          loadedEventCalled++;
        },

        eventInChild: function() {
          eventInChildCalled++;
        },

        empty: SC.State.create({
          eventInChild: function() {
            eventInChildCalled++;
          }
        })
      })
    });

    storyboard.goToState('loading');
    context = null;
  }
});

test("it dispatches events to the current state", function() {
  storyboard.send('anEvent');

  equals(loadingEventCalled, 1, "event was triggered");
});

test("it dispatches events to a parent state if the child state does not respond to it", function() {
  storyboard.goToState('loaded.empty');
  storyboard.send('anEvent');

  equals(loadedEventCalled, 1, "parent state receives event");
});

test("it does not dispatch events to parents if the child responds to it", function() {
  storyboard.goToState('loaded.empty');
  storyboard.send('eventInChild');

  equals(eventInChildCalled, 1, "does not dispatch event to parent");
});

test("it supports arguments to events", function() {
  storyboard.send('anEvent', { context: true });
  equals(passedContext.context, true, "send passes along a context");
});

module("Pivot states", {
  setup: function() {
    var State = SC.State.extend(stateEventStub);

    storyboard = SC.Storyboard.create(stateEventStub, {
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
  storyboard.goToState('grandparent.parent.child');
  equals(storyboard.grandparent.entered, 1, "the top level should be entered");
  equals(storyboard.grandparent.parent.entered, 1, "intermediate states should be entered");
  equals(storyboard.grandparent.parent.child.entered, 1, "the final state should be entered");

  storyboard.goToState('grandparent.parent.sibling');
  equals(storyboard.grandparent.entered, 1, "the top level should not be re-entered");
  equals(storyboard.grandparent.parent.entered, 1, "intermediate states should not be re-entered");
  equals(storyboard.grandparent.parent.child.entered, 1, "the final state should not be re-entered");

  equals(storyboard.grandparent.parent.child.exited, 1, "the child should have exited");
  equals(storyboard.grandparent.exited, 0, "the top level should not have have exited");
  equals(storyboard.grandparent.parent.exited, 0, "intermediate states should not have exited");
});
