import makeArray from '../make-array';

QUnit.module('Ember.makeArray');

QUnit.test('undefined', function() {
  deepEqual(makeArray(), []);
  deepEqual(makeArray(undefined), []);
});

QUnit.test('null', function() {
  deepEqual(makeArray(null), []);
});

QUnit.test('string', function() {
  deepEqual(makeArray('lindsay'), ['lindsay']);
});

QUnit.test('number', function() {
  deepEqual(makeArray(0), [0]);
  deepEqual(makeArray(1), [1]);
});

QUnit.test('array', function() {
  deepEqual(makeArray([1, 2, 42]), [1, 2, 42]);
});

QUnit.test('true', function() {
  deepEqual(makeArray(true), [true]);
});

QUnit.test('false', function() {
  deepEqual(makeArray(false), [false]);
});

QUnit.test('object', function() {
  deepEqual(makeArray({}), [{}]);
});
