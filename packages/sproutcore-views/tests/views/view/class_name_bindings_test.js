// ==========================================================================
// Project:   SproutCore Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

require('sproutcore-views/views/view');

module("SC.View - Bound Class Names");

test("should apply bound class names to the element", function() {
  var view = SC.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false
  });

  view.createElement();
  ok(view.$().hasClass('high'), "adds string values as class name");
  ok(view.$().hasClass('is-urgent'), "adds true Boolean values by dasherizing");
  ok(view.$().hasClass('classified'), "supports customizing class name for Boolean values");
  ok(!view.$().hasClass('can-ignore'), "does not add false Boolean values as class");
});

test("should add, remove, or change class names if changed after element is created", function() {
  var view = SC.View.create({
    classNameBindings: ['priority', 'isUrgent', 'canIgnore'],

    priority: 'high',
    isUrgent: true,
    canIgnore: false
  });

  view.createElement();

  set(view, 'priority', 'orange');
  set(view, 'isUrgent', false);
  set(view, 'canIgnore', true);

  ok(view.$().hasClass('orange'), "updates string values");
  ok(!view.$().hasClass('high'), "removes old string value");

  ok(!view.$().hasClass('is-urgent', "removes dasherized class when changed from true to false"));
  ok(view.$().hasClass('can-ignore'), "adds dasherized class when changed from false to true");
});
