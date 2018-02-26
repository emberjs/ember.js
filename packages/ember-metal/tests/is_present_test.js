import { isPresent } from '..';

QUnit.module('Ember.isPresent');

QUnit.test('Ember.isPresent', function() {
  let string = 'string';
  let fn = function() {};
  let object = { length: 0 };

  equal(false, isPresent(), 'for no params');
  equal(false, isPresent(null), 'for null');
  equal(false, isPresent(undefined), 'for undefined');
  equal(false, isPresent(''), 'for an empty String');
  equal(false, isPresent('  '), 'for a whitespace String');
  equal(false, isPresent('\n\t'), 'for another whitespace String');
  equal(true, isPresent('\n\t Hi'), 'for a String with whitespaces');
  equal(true, isPresent(true), 'for true');
  equal(true, isPresent(false), 'for false');
  equal(true, isPresent(string), 'for a String');
  equal(true, isPresent(fn), 'for a Function');
  equal(true, isPresent(0), 'for 0');
  equal(false, isPresent([]), 'for an empty Array');
  equal(true, isPresent({}), 'for an empty Object');
  equal(false, isPresent(object), 'for an Object that has zero \'length\'');
  equal(true, isPresent([1, 2, 3]), 'for a non-empty array');
});
