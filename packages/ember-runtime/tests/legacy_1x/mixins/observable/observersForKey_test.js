/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Create ObservableObject which includes Ember.Observable
*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================

import {get} from 'ember-metal/property_get';
import EmberObject from 'ember-runtime/system/object';
import Observable from 'ember-runtime/mixins/observable';

var ObservableObject = EmberObject.extend(Observable);

// ..........................................................
// GET()
//

QUnit.module("object.observesForKey()");

QUnit.test("should get observers", function() {
  var o1 = ObservableObject.create({ foo: 100 });
  var o2 = ObservableObject.create({ func() {} });
  var o3 = ObservableObject.create({ func() {} });
  var observers = null;

  equal(get(o1.observersForKey('foo'), 'length'), 0, "o1.observersForKey should return empty array");

  o1.addObserver('foo', o2, o2.func);
  o1.addObserver('foo', o3, o3.func);

  observers = o1.observersForKey('foo');

  equal(get(observers, 'length'), 2, "o2.observersForKey should return an array with length 2");
  equal(observers[0][0], o2, "first item in observers array should be o2");
  equal(observers[1][0], o3, "second item in observers array should be o3");
});
