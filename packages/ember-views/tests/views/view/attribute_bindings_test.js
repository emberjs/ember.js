// ==========================================================================
// Project:   Ember Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

require('ember-views/views/view');

module("Ember.View - Attribute Bindings");

test("should render attribute bindings", function() {
  var view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'submit',
    exploded: false,
    destroyed: false,
    exists: true,
    nothing: null,
    notDefined: undefined,
    notNumber: NaN,
  });

  view.createElement();

  equals(view.$().attr('type'), 'submit', "updates type attribute");
  ok(!view.$().attr('exploded'), "removes exploded attribute when false");
  ok(!view.$().attr('destroyed'), "removes destroyed attribute when false");
  ok(view.$().attr('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  ok(!view.$().attr('notDefined'), "removes notDefined attribute when undefined");
  ok(!view.$().attr('notNumber'), "removes notNumber attribute when NaN");
});

test("should update attribute bindings", function() {
  var view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'reset',
    exploded: true,
    destroyed: true,
    exists: false,
    nothing: true,
    notDefined: true,
    notNumber: true,
    explosions: 15
  });

  view.createElement();
  equals(view.$().attr('type'), 'reset', "adds type attribute");
  ok(view.$().attr('exploded'), "adds exploded attribute when true");
  ok(view.$().attr('destroyed'), "adds destroyed attribute when true");
  ok(!view.$().attr('exists'), "does not add exists attribute when false");
  ok(view.$().attr('nothing'), "adds nothing attribute when true");
  ok(view.$().attr('notDefined'), "adds notDefined attribute when true");
  ok(view.$().attr('notNumber'), "adds notNumber attribute when true");
  equals(view.$().attr('explosions'), "15", "adds integer attributes");

  view.set('type', 'submit');
  view.set('exploded', false);
  view.set('destroyed', false);
  view.set('exists', true);
  view.set('nothing', null);
  view.set('notDefined', undefined);
  view.set('notNumber', NaN);

  equals(view.$().attr('type'), 'submit', "updates type attribute");
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

  Ember.run(function() {
    parentView.append();
  });

  equals(parentView.get('childViews')[0].$().attr('foo'), 'baz');

  parentView.destroy();
  Test.destroy();
});

