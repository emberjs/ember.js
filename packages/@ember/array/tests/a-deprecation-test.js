import { A, internalA } from '@ember/array';
import { setDeprecationStagesConfig } from '@ember/debug';
import { emberVersionGte } from '@ember/-internals/deprecations';
import { moduleForDevelopment, testUnless, AbstractTestCase } from 'internal-test-helpers';

// Under _OVERRIDE_DEPRECATION_VERSION removal simulation these APIs throw
// instead of warning (the test config replaces the harness's except list),
// so the warn-expecting tests are skipped.
const REMOVAL_SIMULATED = emberVersionGte('8.0.0');

moduleForDevelopment(
  'Ember Array deprecation',
  class extends AbstractTestCase {
    teardown() {
      setDeprecationStagesConfig(null);
    }

    ['@test A() is silent by default'](assert) {
      expectNoDeprecation(() => {
        A(['a', 'b']);
      });
      assert.ok(true, 'no deprecations fired');
    }

    [`${testUnless(REMOVAL_SIMULATED)} A() fires when enabled and still works`](assert) {
      setDeprecationStagesConfig({ enable: ['deprecate-ember-array'] });

      let arr;
      expectDeprecation(() => {
        arr = A(['a', 'b']);
      }, /Ember Arrays are deprecated/);

      assert.strictEqual(arr.objectAt(1), 'b', 'the array works');
    }

    ['@test internalA never fires'](assert) {
      setDeprecationStagesConfig({ enable: ['deprecate-ember-array'] });

      expectNoDeprecation(() => {
        internalA(['a', 'b']);
      });
      assert.ok(true, 'no deprecations fired');
    }
  }
);
