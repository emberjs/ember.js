import { run } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const originalDebounce = run.backburner.debounce;
let wasCalled = false;

moduleFor('Ember.run.debounce', class extends AbstractTestCase {
  constructor() {
    super();

    run.backburner.debounce = function() { wasCalled = true; };
  }

  teardown() {
    run.backburner.debounce = originalDebounce;
  }

  ['@test Ember.run.debounce uses Backburner.debounce'](assert) {
    run.debounce(() => {});
    assert.ok(wasCalled, 'Ember.run.debounce used');
  }
});
