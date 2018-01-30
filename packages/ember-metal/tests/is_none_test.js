import { isNone } from '..';

QUnit.module('isNone');

QUnit.test('isNone', function(assert) {
  let string = 'string';
  let fn = function() {};

  assert.equal(true, isNone(null), 'for null');
  assert.equal(true, isNone(undefined), 'for undefined');
  assert.equal(false, isNone(''), 'for an empty String');
  assert.equal(false, isNone(true), 'for true');
  assert.equal(false, isNone(false), 'for false');
  assert.equal(false, isNone(string), 'for a String');
  assert.equal(false, isNone(fn), 'for a Function');
  assert.equal(false, isNone(0), 'for 0');
  assert.equal(false, isNone([]), 'for an empty Array');
  assert.equal(false, isNone({}), 'for an empty Object');
});
