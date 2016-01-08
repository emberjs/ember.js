import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import { addObserver }  from 'ember-metal/observer';
import { A as emberA } from 'ember-runtime/system/native_array';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed obj.set() and obj.get() to Ember.set() and Ember.get()
  * changed obj.addObserver() to addObserver()
*/

QUnit.module('Ember.Observable - Observing with @each');

QUnit.test('chained observers on enumerable properties are triggered when the observed property of any item changes', function() {
  var family = EmberObject.create({ momma: null });
  var momma = EmberObject.create({ children: [] });

  var child1 = EmberObject.create({ name: 'Bartholomew' });
  var child2 = EmberObject.create({ name: 'Agnes' });
  var child3 = EmberObject.create({ name: 'Dan' });
  var child4 = EmberObject.create({ name: 'Nancy' });

  set(family, 'momma', momma);
  set(momma, 'children', emberA([child1, child2, child3]));

  var observerFiredCount = 0;
  addObserver(family, 'momma.children.@each.name', this, function() {
    observerFiredCount++;
  });

  observerFiredCount = 0;
  run(function() { get(momma, 'children').setEach('name', 'Juan'); });
  equal(observerFiredCount, 3, 'observer fired after changing child names');

  observerFiredCount = 0;
  run(function() { get(momma, 'children').pushObject(child4); });
  equal(observerFiredCount, 1, 'observer fired after adding a new item');

  observerFiredCount = 0;
  run(function() { set(child4, 'name', 'Herbert'); });
  equal(observerFiredCount, 1, 'observer fired after changing property on new object');

  set(momma, 'children', []);

  observerFiredCount = 0;
  run(function() { set(child1, 'name', 'Hanna'); });
  equal(observerFiredCount, 0, 'observer did not fire after removing changing property on a removed object');
});

