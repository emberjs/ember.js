import EmberArray, { A } from '@ember/array';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';

const { isEnabled, isRemoved } = DEPRECATIONS.DEPRECATE_EMBER_ARRAY_A;

moduleFor(
  'Ember.A',
  class extends AbstractTestCase {
    [`${testUnless(isRemoved)} @test Ember.A`](assert) {
      expectDeprecation(/`A` from `@ember\/array` is deprecated/, isEnabled);

      assert.deepEqual(A([1, 2]), [1, 2], 'array values were not be modified');
      assert.deepEqual(A(), [], 'returned an array with no arguments');
      assert.deepEqual(A(null), [], 'returned an array with a null argument');
      assert.ok(EmberArray.detect(A()), 'returned an ember array');
      assert.ok(EmberArray.detect(A([1, 2])), 'returned an ember array');
    }

    [`${testUnless(isRemoved)} @test Ember.A returns an Ember array as it is`](assert) {
      expectDeprecation(/`A` from `@ember\/array` is deprecated/, isEnabled);

      let array = A([1, 2]);

      assert.strictEqual(A(array), array);
    }

    [`${testUnless(isRemoved)} @test new Ember.A`](assert) {
      expectAssertion(() => {
        assert.deepEqual(new A([1, 2]), [1, 2], 'array values were not be modified');
        assert.deepEqual(new A(), [], 'returned an array with no arguments');
        assert.deepEqual(new A(null), [], 'returned an array with a null argument');
        assert.ok(EmberArray.detect(new A()), 'returned an ember array');
        assert.ok(EmberArray.detect(new A([1, 2])), 'returned an ember array');
      });
    }
  }
);
