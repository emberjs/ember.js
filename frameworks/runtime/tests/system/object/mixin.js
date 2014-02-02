// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module, test, ok, isObj, equals, expects, same, plan, TestNamespace*/


module("Using mixin with an SC.Object instance", {

  setup: function() {
    MyBindable = SC.Object.create({ x: 1, y: 2 });
  },

  teardown: function() {
    MyBindable = undefined;
  }

});

/**
  There was a bug that using mixin on an object, would not properly set up any
  computed properties, bindings and observers declared in the mixin.
  */
test("Mixins applied to an object should include Mixin properties, bindings and observers", function() {
  var mixin,
    propertyChanged = 0,
    observerCalled = 0;

  // Define a mixin that contains properties, bindings and observers
  mixin = {
    property: 'a',
    computedProperty: function() {
      return this.get('foo');
    }.property('foo'),
    x: 1,
    xBinding: SC.Binding.oneWay("MyBindable.x"),
    yObserver: function() {
      observerCalled++;
    }.observes('MyBindable.y')
  };

  // Mix in the mixin AFTER creating the object.
  obj = SC.Object.create({
    foo: "bar",
    objComputedProperty: function() {
      return this.get('foo');
    }.property('foo'),
    objX: 1,
    objXBinding: SC.Binding.oneWay("MyBindable.x"),
    objYObserver: function() {
      observerCalled++;
    }.observes('MyBindable.y')
  });

  obj.mixin(mixin);

  obj.addObserver('computedProperty', function() {
    propertyChanged++;
  });
  obj.addObserver('objComputedProperty', function() {
    propertyChanged++;
  });

  // Verify initial values.
  equals(propertyChanged, 0, "property invalidated");
  equals(observerCalled, 0, "fires observer");
  equals(obj.get('computedProperty') + ', ' + obj.get('objComputedProperty'), 'bar, bar');
  equals(obj.get('x') + ', ' + obj.get('objX'), '1, 1', "obj bound values should be 1");

  SC.run(function() {
    obj.set('foo', 'not bar');
    MyBindable.set('x', 2);
    MyBindable.set('y', 3);
  });

  // Check that dependent values from the mixin have updated.
  equals(propertyChanged, 2, "property invalidated");
  equals(observerCalled, 2, "fires observer");
  equals(obj.get('computedProperty') + ', ' + obj.get('objComputedProperty'), 'not bar, not bar');
  equals(obj.get('x') + ', ' + obj.get('objX'), '2, 2', "obj bound values should be 2");
});
