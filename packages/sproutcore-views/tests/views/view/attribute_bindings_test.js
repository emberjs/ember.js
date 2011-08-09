// ==========================================================================
// Project:   SproutCore Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

require('sproutcore-views/views/view');

module("SC.View - Attribute Bindings");

test("should render and update attribute bindings", function() {
  var view = SC.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'exploded', 'destroyed', 'exists', 'explosions'],

    type: 'reset',
    exploded: true,
    destroyed: true,
    exists: false,
    explosions: 15
  });

  view.createElement();
  equals(view.$().attr('type'), 'reset', "adds type attribute");
  ok(view.$().attr('exploded'), "adds exploded attribute when true");
  ok(view.$().attr('destroyed'), "adds destroyed attribute when true");
  ok(!view.$().attr('exists'), "does not add exists attribute when false");
  equals(view.$().attr('explosions'), "15", "adds integer attributes");

  view.set('type', 'submit');
  view.set('exploded', false);
  view.set('destroyed', false);
  view.set('exists', true);

  equals(view.$().attr('type'), 'submit', "updates type attribute");
  ok(!view.$().attr('exploded'), "removes exploded attribute when false");
  ok(!view.$().attr('destroyed'), "removes destroyed attribute when false");
  ok(view.$().attr('exists'), "adds exists attribute when true");
});

test("should allow attributes to be set in the inBuffer state", function() {
  var parentView, childViews;
  SC.run(function() {
    window.Test = SC.Namespace.create();
    Test.controller = SC.Object.create({
      foo: 'bar'
    });

    parentView = SC.ContainerView.create();

    childViews = parentView.get('childViews');
    childViews.pushObject(parentView.createChildView(SC.View, {
      template: function() {
        return "foo";
      },

      fooBinding: 'Test.controller.foo',
      attributeBindings: ['foo']
    }));

    childViews.pushObject(parentView.createChildView(SC.View, {
      template: function() {
        Test.controller.set('foo', 'baz');
        return "bar";
      }
    }));

    childViews.pushObject(parentView.createChildView(SC.View, {
      template: function() {
        return "bat";
      }
    }));
  });

  SC.run(function() {
    parentView.append();
  });

  equals(parentView.get('childViews')[0].$().attr('foo'), 'baz');

  parentView.destroy();

});

