import EmberArray from '../../../mixins/array';
import { A } from '../../../system/native_array';

QUnit.module('Ember.A');

QUnit.test('Ember.A', function() {
  deepEqual(A([1, 2]), [1, 2], 'array values were not be modified');
  deepEqual(A(), [], 'returned an array with no arguments');
  deepEqual(A(null), [], 'returned an array with a null argument');
  ok(EmberArray.detect(A()), 'returned an ember array');
  ok(EmberArray.detect(A([1, 2])), 'returned an ember array');
});
