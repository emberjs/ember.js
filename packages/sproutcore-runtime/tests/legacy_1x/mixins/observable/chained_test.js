// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.
  
  CHANGES FROM 1.6:

  * changed obj.set() and obj.get() to SC.set() and SC.get()
  * changed obj.addObserver() to SC.addObserver()
*/

var get = SC.get, set = SC.set;

module("SC.Observable - Observing with @each");

test("chained observers on enumerable properties are triggered when the observed property of any item changes", function() {
  var family = SC.Object.create({ momma: null });
  var momma = SC.Object.create({ children: [] });

  var child1 = SC.Object.create({ name: "Bartholomew" });
  var child2 = SC.Object.create({ name: "Agnes" });
  var child3 = SC.Object.create({ name: "Dan" });
  var child4 = SC.Object.create({ name: "Nancy" });

  set(family, 'momma', momma);
  set(momma, 'children', SC.A([child1, child2, child3]));

  var observerFiredCount = 0;
  SC.addObserver(family, 'momma.children.@each.name', this, function() {
    observerFiredCount++;
  });

  observerFiredCount = 0;
  SC.run(function() { get(momma, 'children').setEach('name', 'Juan'); });
  equals(observerFiredCount, 3, "observer fired after changing child names");

  observerFiredCount = 0;
  SC.run(function() { get(momma, 'children').pushObject(child4); });
  equals(observerFiredCount, 1, "observer fired after adding a new item");

  observerFiredCount = 0;
  SC.run(function() { set(child4, 'name', "Herbert"); });
  equals(observerFiredCount, 1, "observer fired after changing property on new object");

  set(momma, 'children', []);

  observerFiredCount = 0;
  SC.run(function() { set(child1, 'name', "Hanna"); });
  equals(observerFiredCount, 0, "observer did not fire after removing changing property on a removed object");
});

