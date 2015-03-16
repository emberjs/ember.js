import run from 'ember-metal/run_loop';

var originalDebounce = run.backburner.debounce;
var wasCalled = false;
QUnit.module('Ember.run.debounce', {
  setup() {
    run.backburner.debounce = function() { wasCalled = true; };
  },
  teardown() {
    run.backburner.debounce = originalDebounce;
  }
});

QUnit.test('Ember.run.debounce uses Backburner.debounce', function() {
  run.debounce(function() {});
  ok(wasCalled, 'Ember.run.debounce used');
});

