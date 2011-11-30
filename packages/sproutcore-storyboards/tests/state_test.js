require('sproutcore-storyboards/state');

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

module("SC.State#storyboard");

test("a state finds its storyboard", function() {
  var storyboard = SC.Storyboard.create({
    start: SC.State.create()
  });

  equals(getPath(storyboard, 'start.storyboard'), storyboard, "A state's storyboard is its nearest storyboard");
});

module("SC.State#sheet");

test("a state finds its sheet", function() {
  var storyboard = SC.Storyboard.create({
    start: SC.Sheet.create({
      start: SC.State.create()
    })
  });

  equals(getPath(storyboard, 'start.start.storyboard'), storyboard, "A state's storyboard is its nearest storyboard");
  equals(getPath(storyboard, 'start.start.sheet'), get(storyboard, 'start'), "A state's storyboard is its nearest storyboard");
});

module("SC.State#goToState");

test("calling goToState calls goToState on the state's storyboard", function() {
  var newState;

  var storyboard = SC.Object.create({
    goToState: function(state) {
      newState = state;
    }
  });

  var state = SC.State.create({
    storyboard: storyboard,

    child: SC.State.create(),
    sibling: SC.State.create()
  });

  set(storyboard, 'currentState', state);

  state.goToState('child');
  equals(newState, 'child');
});

test("a transition can be asynchronous", function() {
  expect(1);

  var counter = 0;
  var storyboard = SC.Storyboard.create({
    start: SC.State.create({
      finish: function() {
        this.goToState('finished');
      },

      exit: function(transition) {
        // pause QUnit while we test some async functionality
        stop();

        transition.async();

        setTimeout(function() {
          counter++;
          transition.resume();
        }, 50);
      }
    }),

    finished: SC.State.create({
      enter: function() {
        equals(counter, 1, "increments counter and executes transition after specified timeout");
        start();
      },

      exit: function() {
        equals(arguments.length, 0, "does not pass transition object if arguments are empty");
      }
    })
  });

  storyboard.get('currentState').finish();
});
