// ==========================================================================
// Project:   Ember Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get, setPath = Ember.setPath;

require('ember-views/views/view');

module("Ember.View - Class Name Bindings");

test("should apply bound class names to the element", function() {
  var view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified',
                        'canIgnore', 'messages.count', 'messages.resent:is-resent'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false,

    messages: {
      count: 'five-messages',
      resent: true
    }
  });

  view.createElement();
  ok(view.$().hasClass('high'), "adds string values as class name");
  ok(view.$().hasClass('is-urgent'), "adds true Boolean values by dasherizing");
  ok(view.$().hasClass('classified'), "supports customizing class name for Boolean values");
  ok(view.$().hasClass('five-messages'), "supports paths in bindings");
  ok(view.$().hasClass('is-resent'), "supports customing class name for paths");
  ok(!view.$().hasClass('can-ignore'), "does not add false Boolean values as class");
});

test("should add, remove, or change class names if changed after element is created", function() {
  var view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified',
                        'canIgnore', 'messages.count', 'messages.resent:is-resent'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false,

    messages: Ember.Object.create({
      count: 'five-messages',
      resent: false
    })
  });

  view.createElement();

  set(view, 'priority', 'orange');
  set(view, 'isUrgent', false);
  set(view, 'canIgnore', true);
  setPath(view, 'messages.count', 'six-messages');
  setPath(view, 'messages.resent', true );

  ok(view.$().hasClass('orange'), "updates string values");
  ok(!view.$().hasClass('high'), "removes old string value");

  ok(!view.$().hasClass('is-urgent', "removes dasherized class when changed from true to false"));
  ok(view.$().hasClass('can-ignore'), "adds dasherized class when changed from false to true");

  ok(view.$().hasClass('six-messages'), "adds new value when path changes");
  ok(!view.$().hasClass('five-messages'), "removes old value when path changes");

  ok(view.$().hasClass('is-resent'), "adds customized class name when path changes");
});

test("classNames should not be duplicated on rerender", function(){
  var view = Ember.View.create({
    classNameBindings: ['priority'],
    priority: 'high'
  });

  view.createElement();

  equals(view.$().attr('class'), 'ember-view high');

  Ember.run(function(){
    view.rerender();
  });

  equals(view.$().attr('class'), 'ember-view high');
});

test("classNames removed by a classNameBindings observer should not re-appear on rerender", function(){
  var view = Ember.View.create({
    classNameBindings: ['isUrgent'],
    isUrgent: true
  });

  view.createElement();

  equals(view.$().attr('class'), 'ember-view is-urgent');

  Ember.run(function(){
    view.set('isUrgent', false);
  });

  equals(view.$().attr('class'), 'ember-view');

  Ember.run(function(){
    view.rerender();
  });

  equals(view.$().attr('class'), 'ember-view');
});
