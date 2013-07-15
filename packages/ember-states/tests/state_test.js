var get = Ember.get, set = Ember.set, _$;

module("Ember.State");

test("exists", function() {
  ok(Ember.Object.detect(Ember.State), "Ember.State is an Ember.Object");
});

test("creating a state with substates sets the parentState property", function() {
  var state = Ember.State.create({
    child: Ember.State.create()
  });

  equal(state.get('child.parentState'), state, "A child state gets its parent state");
  deepEqual(state.get('childStates'), [ state.get('child') ], "The childStates method returns a state's child states");
});

test("a state is passed its state manager when receiving an enter event", function() {
  expect(2);

  var count = 0;

  var states = {
    load: Ember.State.create({
      enter: function(passedStateManager) {
        if (count === 0) {
          ok(passedStateManager.get('isFirst'), "passes first state manager when created");
        } else {
          ok(passedStateManager.get('isSecond'), "passes second state manager when created");
        }

        count++;
      }
    })
  };

  var stateManager = Ember.StateManager.create({
    initialState: 'load',
    isFirst: true,

    states: states
  });

  var anotherStateManager = Ember.StateManager.create({
    initialState: 'load',
    isSecond: true,

    states: states
  });
});

test("a state can have listeners that are fired when the state is entered", function() {
  expect(2);

  var count = 0;

  var states = {
    load: Ember.State.create()
  };

  states.load.on('enter', function(passedStateManager) {
    if (count === 0) {
      ok(passedStateManager.get('isFirst'), "passes first state manager when created");
    } else {
      ok(passedStateManager.get('isSecond'), "passes second state manager when created");
    }

    count++;
  });

  var stateManager = Ember.StateManager.create({
    initialState: 'load',
    isFirst: true,

    states: states
  });

  var anotherStateManager = Ember.StateManager.create({
    initialState: 'load',
    isSecond: true,

    states: states
  });
});

test("a state finds properties that are states and copies them to the states hash", function() {
  var state1 = Ember.State.create();
  var state2 = Ember.State.create();

  var superClass = Ember.State.extend({
    state1: state1
  });

  var stateInstance = superClass.create({
    state2: state2
  });

  var states = get(stateInstance, 'states');

  deepEqual(states, { state1: state1, state2: state2 }, "states should be retrieved from both the instance and its class");
});

test("a state finds properties that are state classes and instantiates them", function() {
  var state1 = Ember.State.extend({
    isState1: true
  });
  var state2 = Ember.State.extend({
    isState2: true
  });

  var superClass = Ember.State.extend({
    state1: state1
  });

  var stateInstance = superClass.create({
    state2: state2
  });

  var states = get(stateInstance, 'states');

  equal(get(states.state1, 'isState1'), true, "instantiated first state");
  equal(get(states.state2, 'isState2'), true, "instantiated second state");
});

test("states set up proper names on their children", function() {
  var manager = Ember.StateManager.create({
    states: {
      first: Ember.State.extend({
        insideFirst: Ember.State.extend({

        })
      })
    }
  });

  manager.transitionTo('first');
  equal(get(manager, 'currentState.path'), 'first');

  manager.transitionTo('first.insideFirst');
  equal(get(manager, 'currentState.path'), 'first.insideFirst');
});

test("states with child instances set up proper names on their children", function() {
  var manager = Ember.StateManager.create({
    states: {
      first: Ember.State.create({
        insideFirst: Ember.State.create({

        })
      })
    }
  });

  manager.transitionTo('first');
  equal(get(manager, 'currentState.path'), 'first');

  manager.transitionTo('first.insideFirst');
  equal(get(manager, 'currentState.path'), 'first.insideFirst');
});

test("the isLeaf property is false when a state has child states", function() {
  var manager = Ember.StateManager.create({
    states: {
      first: Ember.State.create({
        insideFirst: Ember.State.create(),
        otherInsideFirst: Ember.State.create({
          definitelyInside: Ember.State.create()
        })
      })
    }
  });

  var first = manager.get('states.first');
  var insideFirst = first.get('states.insideFirst');
  var otherInsideFirst = first.get('states.otherInsideFirst');
  var definitelyInside = otherInsideFirst.get('states.definitelyInside');

  equal(first.get('isLeaf'), false);
  equal(insideFirst.get('isLeaf'), true);
  equal(otherInsideFirst.get('isLeaf'), false);
  equal(definitelyInside.get('isLeaf'), true);
});

test("propagates its container to its child states", function() {
  var container = { lookup: Ember.K },
      manager = Ember.StateManager.create({
        container: container,
        states: {
          first: Ember.State.extend({
            insideFirst: Ember.State.extend()
          }),
          second: Ember.State.create()
        }
      });

  var first = manager.get('states.first'),
      insideFirst = first.get('states.insideFirst'),
      second = manager.get('states.second');

  equal(first.container, container, 'container should be given to a `create`ed child state');
  equal(insideFirst.container, container, 'container should be given to a nested child state');
  equal(second.container, container, 'container should be given to a `extend`ed child state after creation');
});

module("Ember.State.transitionTo", {
  setup: function() {
    _$ = Ember.$;
    Ember.$ = {};
    Ember.$.Event = function() {};
  },
  teardown: function() {
    Ember.$ = _$;
  }
});
test("sets the transition target", function() {
  var receivedTarget,
      receivedContext,
      stateManager,
      transitionFunction;

  stateManager = {
    transitionTo: function(target, context) {
      receivedTarget = target;
      receivedContext = context;
    }
  };

  transitionFunction = Ember.State.transitionTo('targetState');

  transitionFunction(stateManager, new Ember.$.Event());

  equal(receivedTarget, 'targetState');
  ok(!receivedContext, "does not pass a context when given an event without context");
});

test("passes no context arguments when there are no contexts", function() {
  var contextArgsCount,
      stateManager,
      transitionFunction,
      event;

  event = new Ember.$.Event();
  event.contexts = [];

  stateManager = {
    transitionTo: function() {
      contextArgsCount = [].slice.call(arguments, 1).length;
    }
  };

  transitionFunction = Ember.State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  equal( contextArgsCount, 0);
});

test("passes through a single context", function() {
  var receivedContext,
      stateManager,
      transitionFunction,
      event;

  event = new Ember.$.Event();
  event.contexts = [{ value: 'context value' }];

  stateManager = {
    transitionTo: function(target, context) {
      receivedContext = context;
    }
  };

  transitionFunction = Ember.State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  equal( receivedContext, event.contexts[0]);
});

test("passes through multiple contexts as additional arguments", function() {
  var receivedContexts,
      stateManager,
      transitionFunction,
      event;

  event = new Ember.$.Event();
  event.contexts = [ { value: 'context1' }, { value: 'context2' } ];

  stateManager = {
    transitionTo: function(target) {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = Ember.State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  deepEqual( receivedContexts, event.contexts);
});

test("does not mutate the event contexts value", function() {
  var receivedContexts,
      stateManager,
      transitionFunction,
      originalContext,
      event;

  originalContext = [ { value: 'context1' }, { value: 'context2' } ];

  event = new Ember.$.Event();
  event.contexts = originalContext.slice();

  stateManager = {
    transitionTo: function(target) {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = Ember.State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  deepEqual(event.contexts, originalContext);
});

test("passes no context arguments when called with no context or event", function() {
  var receivedContexts,
      stateManager,
      transitionFunction;

  stateManager = {
    transitionTo: function(target) {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = Ember.State.transitionTo('targetState');

  transitionFunction(stateManager);

  equal( receivedContexts.length, 0, "transitionTo receives no context");
});

test("handles contexts without an event", function() {
  var receivedContexts,
      stateManager,
      transitionFunction,
      context1,
      context2;

  context1 = { value: 'context1', contexts: 'I am not an event'};
  context2 = { value: 'context2', contexts: ''};

  stateManager = {
    transitionTo: function(target) {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = Ember.State.transitionTo('targetState');

  transitionFunction(stateManager, context1, context2);

  equal( receivedContexts[0], context1, "the first context is passed through" );
  equal( receivedContexts[1], context2, "the second context is passed through" );
});
