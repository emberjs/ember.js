import EmberArray from '../../../mixins/array';
import { A } from '../../../system/native_array';

QUnit.module('Ember.A');

QUnit.test('Ember.A', function(assert) {
  assert.deepEqual(A([1, 2]), [1, 2], 'array values were not be modified');
  assert.deepEqual(A(), [], 'returned an array with no arguments');
  assert.deepEqual(A(null), [], 'returned an array with a null argument');
  assert.ok(EmberArray.detect(A()), 'returned an ember array');
  assert.ok(EmberArray.detect(A([1, 2])), 'returned an ember array');
});
