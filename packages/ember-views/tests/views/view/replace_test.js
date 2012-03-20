// ==========================================================================
// Project:   Ember Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

var View, view, willDestroyCalled, childView;

module("Ember.View - replace()", {
  setup: function() {
    View = Ember.View.extend({});
  },

  teardown: function() {
    view.destroy();
  }
});

test('should replace the specified element', function(){
  Ember.$("#qunit-fixture").html('<div class="header"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.replace('.header');
  });

  var viewElem = Ember.$('#qunit-fixture').children();
  ok(viewElem.length > 0, "creates and replaces the view's element");
});

test('should replace nothing when specified element does not exist', function(){
  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.replace('.not-existing-element');
  });

  var viewElem = Ember.$('#qunit-fixture').children();
  ok(viewElem.length === 0, "is not added when the element which shall be replaces does not exist");
});