require('ember-states/state');

var get = Ember.get, set = Ember.set, getPath = Ember.getPath, setPath = Ember.setPath;

module("Ember.State");

test("exists", function() {
  ok(Ember.Object.detect(Ember.State), "Ember.State is an Ember.Object");
});

test("creating a state with substates sets the parentState property", function() {
  var state = Ember.State.create({
    child: Ember.State.create()
  });

  ok(state.getPath('child.parentState'), state, "A child state gets its parent state");
});

test("a state is passed its state manager when receiving an enter event", function() {
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
