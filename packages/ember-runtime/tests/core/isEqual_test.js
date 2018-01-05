import isEqual from '../../is-equal';

QUnit.module('isEqual');

QUnit.test('undefined and null', function(assert) {
  assert.ok(isEqual(undefined, undefined), 'undefined is equal to undefined');
  assert.ok(!isEqual(undefined, null), 'undefined is not equal to null');
  assert.ok(isEqual(null, null), 'null is equal to null');
  assert.ok(!isEqual(null, undefined), 'null is not equal to undefined');
});

QUnit.test('strings should be equal', function(assert) {
  assert.ok(!isEqual('Hello', 'Hi'), 'different Strings are unequal');
  assert.ok(isEqual('Hello', 'Hello'), 'same Strings are equal');
});

QUnit.test('numericals should be equal', function(assert) {
  assert.ok(isEqual(24, 24), 'same numbers are equal');
  assert.ok(!isEqual(24, 21), 'different numbers are inequal');
});

QUnit.test('dates should be equal', function(assert) {
  assert.ok(isEqual(new Date(1985, 7, 22), new Date(1985, 7, 22)), 'same dates are equal');
  assert.ok(!isEqual(new Date(2014, 7, 22), new Date(1985, 7, 22)), 'different dates are not equal');
});

QUnit.test('array should be equal', function(assert) {
  // NOTE: We don't test for array contents -- that would be too expensive.
  assert.ok(!isEqual([1, 2], [1, 2]), 'two array instances with the same values should not be equal');
  assert.ok(!isEqual([1, 2], [1]), 'two array instances with different values should not be equal');
});

QUnit.test('first object implements isEqual should use it', function(assert) {
  assert.ok(isEqual({ isEqual() { return true; } }, null), 'should return true always');

  let obj = { isEqual() { return false; } };
  assert.equal(isEqual(obj, obj), false, 'should return false because isEqual returns false');
});
