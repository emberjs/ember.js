import { DEBUG } from 'ember-env-flags';
import { assert as emberAssert, runInDebug } from 'ember-debug';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'production builds',
  class extends AbstractTestCase {
    ['@test assert does not throw in production builds'](assert) {
      if (!DEBUG) {
        assert.expect(1);

        try {
          emberAssert('Should not throw');
          assert.ok(true, 'Ember.assert did not throw');
        } catch (e) {
          assert.ok(false, `Expected assert not to throw but it did: ${e.message}`);
        }
      } else {
        assert.expect(0);
      }
    }

    ['@test runInDebug does not run the callback in production builds'](assert) {
      if (!DEBUG) {
        let fired = false;
        runInDebug(() => (fired = true));

        assert.equal(fired, false, 'runInDebug callback should not be ran');
      } else {
        assert.expect(0);
      }
    }
  }
);
