// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

module("Ember.View.create");

test("registers view in the global views hash using layerId for event targeted", function() {
  var v = Ember.View.create();
  equals(Ember.View.views[get(v, 'elementId')], v, 'registers view');
});

test("registers itself with a controller if the viewController property is set", function() {
  window.TestApp = {};
  TestApp.fooController = Ember.Object.create();

  var v = Ember.View.create({
    viewController: 'TestApp.fooController'
  });

  equal(TestApp.fooController.get('view'), v, "sets the view property of the controller");
});

test("duplicates classNames array", function() {
  var classNames = ['one', 'two', 'three'];
  var v = Ember.View.create({
    classNames: classNames
  });

  equal(classNames.length, 3, "should not modify original array");
  deepEqual(v.get('classNames'), ['ember-view', 'one', 'two', 'three'], "should have specified classes");
});

test("handles computed classNames", function() {
  var v = Ember.View.create({
    classNames: Ember.computed(function(){
      return ['one', 'two', 'three'];
    }).property()
  });

  deepEqual(v.get('classNames'), ['one', 'two', 'three'], "should return computed property");
});
