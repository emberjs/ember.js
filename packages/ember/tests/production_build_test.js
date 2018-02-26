import { DEBUG } from 'ember-env-flags'
import {
  assert as emberAssert,
  runInDebug
} from 'ember-debug';

QUnit.module('production builds');

if (!DEBUG) {
  QUnit.test('assert does not throw in production builds', function(assert) {
    assert.expect(1);

    try {
      emberAssert('Should not throw');
      assert.ok(true, 'Ember.assert did not throw');
    } catch (e) {
      assert.ok(false, `Expected assert not to throw but it did: ${e.message}`);
    }
  });

  QUnit.test('runInDebug does not run the callback in production builds', function(assert) {
    let fired = false;
    runInDebug(() => fired = true);

    assert.equal(fired, false, 'runInDebug callback should not be ran');
  });
}
