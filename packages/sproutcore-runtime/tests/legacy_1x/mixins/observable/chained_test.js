// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.
  
  CHANGES FROM 1.6:

  * changed obj.set() and obj.get() to Ember.set() and Ember.get()
  * changed obj.addObserver() to Ember.addObserver()
*/

var get = Ember.get, set = Ember.set;

module("Ember.Observable - Observing with @each");

test("chained observers on enumerable properties are triggered when the observed property of any item changes", function() {
  var family = Ember.Object.create({ momma: null });
  var momma = Ember.Object.create({ children: [] });

  var child1 = Ember.Object.create({ name: "Bartholomew" });
  var child2 = Ember.Object.create({ name: "Agnes" });
  var child3 = Ember.Object.create({ name: "Dan" });
  var child4 = Ember.Object.create({ name: "Nancy" });

  set(family, 'momma', momma);
  set(momma, 'children', Ember.A([child1, child2, child3]));

  var observerFiredCount = 0;
  Ember.addObserver(family, 'momma.children.@each.name', this, function() {
    observerFiredCount++;
  });

  observerFiredCount = 0;
  Ember.run(function() { get(momma, 'children').setEach('name', 'Juan'); });
  equals(observerFiredCount, 3, "observer fired after changing child names");

  observerFiredCount = 0;
  Ember.run(function() { get(momma, 'children').pushObject(child4); });
  equals(observerFiredCount, 1, "observer fired after adding a new item");

  observerFiredCount = 0;
  Ember.run(function() { set(child4, 'name', "Herbert"); });
  equals(observerFiredCount, 1, "observer fired after changing property on new object");

  set(momma, 'children', []);

  observerFiredCount = 0;
  Ember.run(function() { set(child1, 'name', "Hanna"); });
  equals(observerFiredCount, 0, "observer did not fire after removing changing property on a removed object");
});

