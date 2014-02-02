// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

module("SC.CoreView - Attribute Bindings");

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

  view.createLayer();
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
