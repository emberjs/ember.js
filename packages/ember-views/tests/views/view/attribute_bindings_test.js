// ==========================================================================
// Project:   Ember Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global Test:true*/
var set = Ember.set, get = Ember.get;

var view;

module("Ember.View - Attribute Bindings", {
  teardown: function() {
    if (view) {
      view.destroy();
      view = null;
    }
  }
});

test("should render attribute bindings", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'isDisabled:disabled', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'submit',
    isDisabled: true,
    exploded: false,
    destroyed: false,
    exists: true,
    nothing: null,
    notDefined: undefined,
    notNumber: NaN
  });

  view.createElement();

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(view.$().attr('disabled'), "supports customizing attribute name for Boolean values");
  ok(!view.$().attr('exploded'), "removes exploded attribute when false");
  ok(!view.$().attr('destroyed'), "removes destroyed attribute when false");
  ok(view.$().attr('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  ok(!view.$().attr('notDefined'), "removes notDefined attribute when undefined");
  ok(!view.$().attr('notNumber'), "removes notNumber attribute when NaN");
});

test("should update attribute bindings", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'isDisabled:disabled', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'reset',
    isDisabled: true,
    exploded: true,
    destroyed: true,
    exists: false,
    nothing: true,
    notDefined: true,
    notNumber: true,
    explosions: 15
  });

  view.createElement();

  equal(view.$().attr('type'), 'reset', "adds type attribute");
  ok(view.$().attr('disabled'), "adds disabled attribute when true");
  ok(view.$().attr('exploded'), "adds exploded attribute when true");
  ok(view.$().attr('destroyed'), "adds destroyed attribute when true");
  ok(!view.$().attr('exists'), "does not add exists attribute when false");
  ok(view.$().attr('nothing'), "adds nothing attribute when true");
  ok(view.$().attr('notDefined'), "adds notDefined attribute when true");
  ok(view.$().attr('notNumber'), "adds notNumber attribute when true");
  equal(view.$().attr('explosions'), "15", "adds integer attributes");

  view.set('type', 'submit');
  view.set('isDisabled', false);
  view.set('exploded', false);
  view.set('destroyed', false);
  view.set('exists', true);
  view.set('nothing', null);
  view.set('notDefined', undefined);
  view.set('notNumber', NaN);

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(!view.$().attr('disabled'), "removes disabled attribute when false");
  ok(!view.$().attr('exploded'), "removes exploded attribute when false");
  ok(!view.$().attr('destroyed'), "removes destroyed attribute when false");
  ok(view.$().attr('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  ok(!view.$().attr('notDefined'), "removes notDefined attribute when undefined");
  ok(!view.$().attr('notNumber'), "removes notNumber attribute when NaN");
});

test("should allow attributes to be set in the inBuffer state", function() {
  var parentView, childViews;
  Ember.run(function() {
    window.Test = Ember.Namespace.create();
    Test.controller = Ember.Object.create({
      foo: 'bar'
    });

    parentView = Ember.ContainerView.create();

    childViews = parentView.get('childViews');
    childViews.pushObject(parentView.createChildView(Ember.View, {
      template: function() {
        return "foo";
      },

      fooBinding: 'Test.controller.foo',
      attributeBindings: ['foo']
    }));

    childViews.pushObject(parentView.createChildView(Ember.View, {
      template: function() {
        Test.controller.set('foo', 'baz');
        return "bar";
      }
    }));

    childViews.pushObject(parentView.createChildView(Ember.View, {
      template: function() {
        return "bat";
      }
    }));
  });

  try {
    Ember.TESTING_DEPRECATION = true;

    Ember.run(function() {
      parentView.append();
    });
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }

  equal(parentView.get('childViews')[0].$().attr('foo'), 'baz');

  parentView.destroy();
  Test.destroy();
});

// This comes into play when using the {{#each}} helper. If the
// passed array item is a String, it will be converted into a
// String object instead of a normal string.
test("should allow binding to String objects", function() {
  view = Ember.View.create({
    attributeBindings: ['foo'],
    // JSHint doesn't like `new String` so we'll create it the same way it gets created in practice
    foo: (function(){ return this; }).call("bar")
  });

  view.createElement();

  equal(view.$().attr('foo'), 'bar', "should convert String object to bare string");
});
