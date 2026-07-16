import { A, internalA } from '@ember/array';
import { setDeprecationStagesConfig } from '@ember/debug';
import { moduleForDevelopment, AbstractTestCase } from 'internal-test-helpers';

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

    ['@test A() fires when enabled and still works'](assert) {
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
