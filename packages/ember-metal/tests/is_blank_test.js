import isBlank from '../is_blank';

QUnit.module('Ember.isBlank');

QUnit.test('Ember.isBlank', function() {
  let string = 'string';
  let fn = function() {};
  let object = { length: 0 };

  equal(true, isBlank(null), 'for null');
  equal(true, isBlank(undefined), 'for undefined');
  equal(true, isBlank(''), 'for an empty String');
  equal(true, isBlank('  '), 'for a whitespace String');
  equal(true, isBlank('\n\t'), 'for another whitespace String');
  equal(false, isBlank('\n\t Hi'), 'for a String with whitespaces');
  equal(false, isBlank(true), 'for true');
  equal(false, isBlank(false), 'for false');
  equal(false, isBlank(string), 'for a String');
  equal(false, isBlank(fn), 'for a Function');
  equal(false, isBlank(0), 'for 0');
  equal(true, isBlank([]), 'for an empty Array');
  equal(false, isBlank({}), 'for an empty Object');
  equal(true, isBlank(object), 'for an Object that has zero \'length\'');
  equal(false, isBlank([1, 2, 3]), 'for a non-empty array');
});
