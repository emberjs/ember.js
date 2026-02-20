import EmberArray from '@ember/array';
import { A } from '@ember/array';
import {
  moduleFor,
  emberAWithoutDeprecation,
  AbstractTestCase,
  expectDeprecation,
} from 'internal-test-helpers';

moduleFor(
  'Ember.A',
  class extends AbstractTestCase {
    ['@test Ember.A'](assert) {
      assert.deepEqual(
        emberAWithoutDeprecation([1, 2]),
        [1, 2],
        'array values were not be modified'
      );
      assert.deepEqual(emberAWithoutDeprecation(), [], 'returned an array with no arguments');
      assert.deepEqual(
        emberAWithoutDeprecation(null),
        [],
        'returned an array with a null argument'
      );
      expectDeprecation(() => {
        assert.ok(EmberArray.detect(emberAWithoutDeprecation()), 'returned an ember array');
        assert.ok(EmberArray.detect(emberAWithoutDeprecation([1, 2])), 'returned an ember array');
      }, /Usage of EmberArray is deprecated/);
    }

    ['@test Ember.A deprecation'](assert) {
      expectDeprecation(() => {
        assert.deepEqual(A([1, 2]), [1, 2], 'array values were not be modified');
        assert.deepEqual(A(), [], 'returned an array with no arguments');
        assert.deepEqual(A(null), [], 'returned an array with a null argument');
      }, /Usage of Ember.A is deprecated/);
    }

    ['@test new Ember.A'](assert) {
      expectAssertion(() => {
        expectDeprecation(() => {
          assert.deepEqual(new A([1, 2]), [1, 2], 'array values were not be modified');
          assert.deepEqual(new A(), [], 'returned an array with no arguments');
          assert.deepEqual(new A(null), [], 'returned an array with a null argument');
        }, /Usage of Ember.A is deprecated/);
        expectDeprecation(() => {
          assert.ok(EmberArray.detect(new emberAWithoutDeprecation()), 'returned an ember array');
          assert.ok(
            EmberArray.detect(new emberAWithoutDeprecation([1, 2])),
            'returned an ember array'
          );
        }, /Usage of EmberArray is deprecated/);
      });
    }
  }
);
