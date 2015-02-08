import { hasPropertyAccessors } from "ember-metal/platform/define_property";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";

var view;

QUnit.module("views/view/state_deprecation", {
  teardown: function() {
    if (view) {
      run(view, 'destroy');
    }
  }
});

if (hasPropertyAccessors) {
  QUnit.test("view.state should be an alias of view._state with a deprecation", function() {
    expect(2);
    view = EmberView.create();

    expectDeprecation(function() {
      equal(view._state, view.state, '_state and state are aliased');
    }, 'Usage of `state` is deprecated, use `_state` instead.');
  });

  QUnit.test("view.states should be an alias of view._states with a deprecation", function() {
    expect(2);
    view = EmberView.create();

    expectDeprecation(function() {
      equal(view._states, view.states, '_states and states are aliased');
    }, 'Usage of `states` is deprecated, use `_states` instead.');
  });
}

QUnit.test("no deprecation is printed if view.state or view._state is not looked up", function() {
  expect(2);
  expectNoDeprecation();

  var view = EmberView.create();

  ok(view, 'view was created');
});
