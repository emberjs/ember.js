import isEmpty from 'ember-metal/is_empty';
import {
  Map,
  OrderedSet
} from 'ember-metal/map';

QUnit.module("Ember.isEmpty");

QUnit.test("Ember.isEmpty", function() {
  var string = "string";
  var fn = function() {};
  var object = { length: 0 };

  equal(true, isEmpty(null), "for null");
  equal(true, isEmpty(undefined), "for undefined");
  equal(true, isEmpty(""), "for an empty String");
  equal(false, isEmpty(true), "for true");
  equal(false, isEmpty(false), "for false");
  equal(false, isEmpty(string), "for a String");
  equal(false, isEmpty(fn), "for a Function");
  equal(false, isEmpty(0), "for 0");
  equal(true, isEmpty([]), "for an empty Array");
  equal(false, isEmpty({}), "for an empty Object");
  equal(true, isEmpty(object), "for an Object that has zero 'length'");
});

QUnit.test("Ember.isEmpty Ember.Map", function() {
  var map = new Map();
  equal(true, isEmpty(map), "Empty map is empty");
  map.set('foo', 'bar');
  equal(false, isEmpty(map), "Map is not empty");
});

QUnit.test("Ember.isEmpty Ember.OrderedSet", function() {
  var orderedSet = new OrderedSet();
  equal(true, isEmpty(orderedSet), "Empty ordered set is empty");
  orderedSet.add('foo');
  equal(false, isEmpty(orderedSet), "Ordered set is not empty");
});
