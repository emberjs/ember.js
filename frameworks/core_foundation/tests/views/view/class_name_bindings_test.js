// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

module("SC.CoreView - Class Name Bindings");

test("should apply bound class names to the element", function() {
  var view = SC.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false
  });

  view.createLayer();
  ok(view.$().hasClass('high'), "adds string values as class name");
  ok(view.$().hasClass('is-urgent'), "adds true Boolean values by dasherizing");
  ok(view.$().hasClass('classified'), "supports customizing class name for Boolean values");
  ok(!view.$().hasClass('can-ignore'), "does not add false Boolean values as class");
});

test("should add, remove, or change class names if changed after element is created", function() {
  var view = SC.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false
  });

  view.createLayer();

  view.set('priority', 'orange');
  view.set('isUrgent', false);
  view.set('isClassified', false);
  view.set('canIgnore', true);

  ok(view.$().hasClass('orange'), "updates string values");
  ok(!view.$().hasClass('high'), "removes old string value");

  ok(!view.$().hasClass('is-urgent'), "removes dasherized class when changed from true to false");
  ok(!view.$().hasClass('classified'), "removes customized class name when changed from true to false");
  ok(view.$().hasClass('can-ignore'), "adds dasherized class when changed from false to true");
});

test("should preserve class names applied via classNameBindings when view layer is updated",
function(){
  var view = SC.View.create({
    classNameBindings: ['isUrgent', 'isClassified:classified'],
    isClassified: true,
    isUrgent: false
  });
  view.createLayer();
  ok(!view.$().hasClass('can-ignore'), "does not add false Boolean values as class");
  ok(view.$().hasClass('classified'), "supports customizing class name for Boolean values");
  view.set('isClassified', false);
  view.set('isUrgent', true);
  ok(view.$().hasClass('is-urgent'), "adds dasherized class when changed from false to true");
  ok(!view.$().hasClass('classified'), "removes customized class name when changed from true to false");
  view.set('layerNeedsUpdate', YES);
  view.updateLayer();
  ok(view.$().hasClass('is-urgent'), "still has class when view display property is updated");
  ok(!view.$().hasClass('classified'), "still does not have customized class when view display property is updated");
});
