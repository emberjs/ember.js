// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

var set = Ember.set, get = Ember.get;

// .......................................................
//  render()
//
module("Ember.View#render");

test("default implementation does not render child views", function() {

  var rendered = 0, updated = 0, parentRendered = 0, parentUpdated = 0 ;
  var view = Ember.ContainerView.create({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: Ember.View.create({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  view.createElement();
  equal(rendered, 1, 'rendered the child once');
  equal(parentRendered, 1);
  equal(view.$('div').length, 1);

});

test("should invoke renderChildViews if layer is destroyed then re-rendered", function() {

  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;
  var view = Ember.ContainerView.create({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: Ember.View.create({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equal(rendered, 1, 'rendered the child once');
  equal(parentRendered, 1);
  equal(view.$('div').length, 1);

  Ember.run(function() {
    view.rerender();
  });

  equal(rendered, 2, 'rendered the child twice');
  equal(parentRendered, 2);
  equal(view.$('div').length, 1);

  view.destroy();
});

test("should render child views with a different tagName", function() {
  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;

  var view = Ember.ContainerView.create({
    childViews: ["child"],

    child: Ember.View.create({
      tagName: 'aside'
    })
  });

  view.createElement();
  equal(view.$('aside').length, 1);
});

test("should add ember-view to views", function() {
  var view = Ember.View.create();

  view.createElement();
  ok(view.$().hasClass('ember-view'), "the view has ember-view");
});

test("should not add role attribute unless one is specified", function() {
  var view = Ember.View.create();

  view.createElement();
  ok(view.$().attr('role') === undefined, "does not have a role attribute");
});
