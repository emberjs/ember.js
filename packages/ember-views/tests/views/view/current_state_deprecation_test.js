import EmberView from 'ember-views/views/view';
import run from 'ember-metal/run_loop';

var view;

QUnit.module('views/view/current_state_deprecation', {
  setup() {
    view = EmberView.create();
  },
  teardown() {
    run(view, 'destroy');
  }
});

QUnit.test('deprecates when calling currentState', function() {
  expect(2);

  view = EmberView.create();

  expectDeprecation(function() {
    equal(view.currentState, view._currentState);
  }, 'Usage of `currentState` is deprecated, use `_currentState` instead.');
});

QUnit.test('doesn\'t deprecate when calling _currentState', function() {
  expect(1);

  view = EmberView.create();
  ok(view._currentState, '_currentState can be used without deprecation');
});
