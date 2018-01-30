import { isPresent } from '..';

QUnit.module('isPresent');

QUnit.test('isPresent', function(assert) {
  let string = 'string';
  let fn = function() {};
  let object = { length: 0 };

  assert.equal(false, isPresent(), 'for no params');
  assert.equal(false, isPresent(null), 'for null');
  assert.equal(false, isPresent(undefined), 'for undefined');
  assert.equal(false, isPresent(''), 'for an empty String');
  assert.equal(false, isPresent('  '), 'for a whitespace String');
  assert.equal(false, isPresent('\n\t'), 'for another whitespace String');
  assert.equal(true, isPresent('\n\t Hi'), 'for a String with whitespaces');
  assert.equal(true, isPresent(true), 'for true');
  assert.equal(true, isPresent(false), 'for false');
  assert.equal(true, isPresent(string), 'for a String');
  assert.equal(true, isPresent(fn), 'for a Function');
  assert.equal(true, isPresent(0), 'for 0');
  assert.equal(false, isPresent([]), 'for an empty Array');
  assert.equal(true, isPresent({}), 'for an empty Object');
  assert.equal(false, isPresent(object), 'for an Object that has zero \'length\'');
  assert.equal(true, isPresent([1, 2, 3]), 'for a non-empty array');
});
