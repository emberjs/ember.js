// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
module("SC.Observable - Observing with @each");

test("chained observers on enumerable properties are triggered when the observed property of any item changes", function() {
  var family = SC.Object.create({ momma: null });
  var momma = SC.Object.create({ children: [] });

  var child1 = SC.Object.create({ name: "Bartholomew" });
  var child2 = SC.Object.create({ name: "Agnes" });
  var child3 = SC.Object.create({ name: "Dan" });
  var child4 = SC.Object.create({ name: "Nancy" });

  family.set('momma', momma);
  momma.set('children', [child1, child2, child3]);

  var observerFiredCount = 0;
  family.addObserver('momma.children.@each.name', this, function() {
    observerFiredCount++;
  });

  observerFiredCount = 0;
  SC.run(function() { momma.get('children').setEach('name', 'Juan'); });
  equals(observerFiredCount, 3, "observer fired after changing child names");

  observerFiredCount = 0;
  SC.run(function() { momma.children.pushObject(child4); });
  equals(observerFiredCount, 1, "observer fired after adding a new item");

  observerFiredCount = 0;
  SC.run(function() { child4.set('name', "Herbert"); });
  equals(observerFiredCount, 1, "observer fired after changing property on new object");

  momma.set('children', []);

  observerFiredCount = 0;
  SC.run(function() { child1.set('name', "Hanna"); });
  equals(observerFiredCount, 0, "observer did not fire after removing changing property on a removed object");
});

