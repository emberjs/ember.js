import EmberArray from '@ember/array';
import { A } from '@ember/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.A',
  class extends AbstractTestCase {
    ['@test Ember.A'](assert) {
      assert.deepEqual(A([1, 2]), [1, 2], 'array values were not be modified');
      assert.deepEqual(A(), [], 'returned an array with no arguments');
      assert.deepEqual(A(null), [], 'returned an array with a null argument');
      assert.ok(EmberArray.detect(A()), 'returned an ember array');
      assert.ok(EmberArray.detect(A([1, 2])), 'returned an ember array');
    }

    ['@test new Ember.A'](assert) {
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
