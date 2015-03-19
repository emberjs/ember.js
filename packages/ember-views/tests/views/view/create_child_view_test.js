import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";

var view, myViewClass, newView, container;

QUnit.module("EmberView#createChildView", {
  setup() {
    container = { };

    view = EmberView.create({
      container: container
    });

    myViewClass = EmberView.extend({ isMyView: true, foo: 'bar' });
  },

  teardown() {
    run(function() {
      view.destroy();
      if (newView) { newView.destroy(); }
    });
  }
});

QUnit.test("should create view from class with any passed attributes", function() {
  var attrs = {
    foo: "baz"
  };

  newView = view.createChildView(myViewClass, attrs);

  equal(newView.container, container, 'expects to share container with parent');
  ok(get(newView, 'isMyView'), 'newView is instance of myView');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');
  ok(!attrs.parentView, "the original attributes hash was not mutated");
});

QUnit.test("should set newView.parentView to receiver", function() {
  newView = view.createChildView(myViewClass);

  equal(newView.container, container, 'expects to share container with parent');
  equal(get(newView, 'parentView'), view, 'newView.parentView == view');
});

QUnit.test("should create property on parentView to a childView instance if provided a viewName", function() {
  var attrs = {
    viewName: "someChildView"
  };

  newView = view.createChildView(myViewClass, attrs);
  equal(newView.container, container, 'expects to share container with parent');

  equal(get(view, 'someChildView'), newView);
});

QUnit.skip("should update a view instances attributes, including the _parentView and container properties", function() {
  var attrs = {
    foo: "baz"
  };

  var myView = myViewClass.create();
  newView = view.createChildView(myView, attrs);

  equal(newView.container, container, 'expects to share container with parent');
  equal(newView._parentView, view, 'expects to have the correct parent');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');

  deepEqual(newView, myView);
});

QUnit.skip("should create from string via container lookup", function() {
  var ChildViewClass = EmberView.extend();
  var fullName = 'view:bro';

  view.container.lookupFactory = function(viewName) {
    equal(fullName, viewName);

    return ChildViewClass.extend({
      container: container
    });
  };

  newView = view.createChildView('bro');

  equal(newView.container, container, 'expects to share container with parent');
  equal(newView._parentView, view, 'expects to have the correct parent');
});

QUnit.test("should assert when trying to create childView from string, but no such view is registered", function() {
  view.container.lookupFactory = function() {};

  expectAssertion(function() {
    view.createChildView('bro');
  });
});

