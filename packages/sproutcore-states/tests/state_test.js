require('sproutcore-states/state');

var get = SC.get, set = SC.set, getPath = SC.getPath, setPath = SC.setPath;

module("SC.State");

test("exists", function() {
  ok(SC.Object.detect(SC.State), "SC.State is an SC.Object");
});

test("creating a state with substates sets the parentState property", function() {
  var state = SC.State.create({
    child: SC.State.create()
  });

  ok(state.getPath('child.parentState'), state, "A child state gets its parent state");
});

test("a state is passed its state manager when receiving an enter event", function() {
  var count = 0;

  var states = {
    load: SC.State.create({
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

  var stateManager = SC.StateManager.create({
    initialState: 'load',
    isFirst: true,

    states: states
  });

  var anotherStateManager = SC.StateManager.create({
    initialState: 'load',
    isSecond: true,

    states: states
  });
});

