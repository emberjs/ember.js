import isEmpty from '../is_empty';
import {
  Map,
  OrderedSet
} from '../map';

QUnit.module('Ember.isEmpty');

QUnit.test('Ember.isEmpty', function() {
  let string = 'string';
  let fn = function() {};
  let object = { length: 0 };

  equal(true, isEmpty(null), 'for null');
  equal(true, isEmpty(undefined), 'for undefined');
  equal(true, isEmpty(''), 'for an empty String');
  equal(false, isEmpty('  '), 'for a whitespace String');
  equal(false, isEmpty('\n\t'), 'for another whitespace String');
  equal(false, isEmpty(true), 'for true');
  equal(false, isEmpty(false), 'for false');
  equal(false, isEmpty(string), 'for a String');
  equal(false, isEmpty(fn), 'for a Function');
  equal(false, isEmpty(0), 'for 0');
  equal(true, isEmpty([]), 'for an empty Array');
  equal(false, isEmpty({}), 'for an empty Object');
  equal(true, isEmpty(object), 'for an Object that has zero \'length\'');
});

QUnit.test('Ember.isEmpty Ember.Map', function() {
  let map = new Map();
  equal(true, isEmpty(map), 'Empty map is empty');
  map.set('foo', 'bar');
  equal(false, isEmpty(map), 'Map is not empty');
});

QUnit.test('Ember.isEmpty Ember.OrderedSet', function() {
  let orderedSet = new OrderedSet();
  equal(true, isEmpty(orderedSet), 'Empty ordered set is empty');
  orderedSet.add('foo');
  equal(false, isEmpty(orderedSet), 'Ordered set is not empty');
});
