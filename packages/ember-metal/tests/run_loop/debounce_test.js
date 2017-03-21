import { run } from '../..';

const originalDebounce = run.backburner.debounce;
let wasCalled = false;

QUnit.module('Ember.run.debounce', {
  setup() {
    run.backburner.debounce = function() { wasCalled = true; };
  },
  teardown() {
    run.backburner.debounce = originalDebounce;
  }
});

QUnit.test('Ember.run.debounce uses Backburner.debounce', function() {
  run.debounce(() => {});
  ok(wasCalled, 'Ember.run.debounce used');
});

