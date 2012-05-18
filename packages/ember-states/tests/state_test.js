var get = Ember.get, set = Ember.set, getPath = Ember.getPath, setPath = Ember.setPath;

module("Ember.State");

test("exists", function() {
  ok(Ember.Object.detect(Ember.State), "Ember.State is an Ember.Object");
});

test("creating a state with substates sets the parentState property", function() {
  var state = Ember.State.create({
    child: Ember.State.create()
  });

  equal(state.getPath('child.parentState'), state, "A child state gets its parent state");
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

  manager.goToState('first');
  equal(getPath(manager, 'currentState.path'), 'first');

  manager.goToState('first.insideFirst');
  equal(getPath(manager, 'currentState.path'), 'first.insideFirst');
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

  manager.goToState('first');
  equal(getPath(manager, 'currentState.path'), 'first');

  manager.goToState('first.insideFirst');
  equal(getPath(manager, 'currentState.path'), 'first.insideFirst');
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

  var first = manager.getPath('states.first');
  var insideFirst = first.getPath('states.insideFirst');
  var otherInsideFirst = first.getPath('states.otherInsideFirst');
  var definitelyInside = otherInsideFirst.getPath('states.definitelyInside');

  equal(first.get('isLeaf'), false);
  equal(insideFirst.get('isLeaf'), true);
  equal(otherInsideFirst.get('isLeaf'), false);
  equal(definitelyInside.get('isLeaf'), true);
});
