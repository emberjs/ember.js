import {
  isEmpty,
  Map,
  OrderedSet
} from '..';

QUnit.module('isEmpty');

QUnit.test('isEmpty', function(assert) {
  let string = 'string';
  let fn = function() {};
  let object = { length: 0 };

  assert.equal(true, isEmpty(null), 'for null');
  assert.equal(true, isEmpty(undefined), 'for undefined');
  assert.equal(true, isEmpty(''), 'for an empty String');
  assert.equal(false, isEmpty('  '), 'for a whitespace String');
  assert.equal(false, isEmpty('\n\t'), 'for another whitespace String');
  assert.equal(false, isEmpty(true), 'for true');
  assert.equal(false, isEmpty(false), 'for false');
  assert.equal(false, isEmpty(string), 'for a String');
  assert.equal(false, isEmpty(fn), 'for a Function');
  assert.equal(false, isEmpty(0), 'for 0');
  assert.equal(true, isEmpty([]), 'for an empty Array');
  assert.equal(false, isEmpty({}), 'for an empty Object');
  assert.equal(true, isEmpty(object), 'for an Object that has zero \'length\'');
});

QUnit.test('isEmpty Map', function(assert) {
  let map = new Map();
  assert.equal(true, isEmpty(map), 'Empty map is empty');
  map.set('foo', 'bar');
  assert.equal(false, isEmpty(map), 'Map is not empty');
});

QUnit.test('isEmpty Ember.OrderedSet', function(assert) {
  let orderedSet = new OrderedSet();
  assert.equal(true, isEmpty(orderedSet), 'Empty ordered set is empty');
  orderedSet.add('foo');
  assert.equal(false, isEmpty(orderedSet), 'Ordered set is not empty');
});
