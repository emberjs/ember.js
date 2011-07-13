// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

var set = SC.set, get = SC.get;

// .......................................................
//  render()
//
module("SC.View#render");

test("default implementation does not render child views", function() {

  var rendered = 0, updated = 0, parentRendered = 0, parentUpdated = 0 ;
  var view = SC.ContainerView.create({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: SC.View.create({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  view.createElement();
  equals(rendered, 1, 'rendered the child once');
  equals(parentRendered, 1);
  equals(view.$('div').length, 1);

});

test("should invoke renderChildViews if layer is destroyed then re-rendered", function() {

  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;
  var view = SC.ContainerView.create({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: SC.View.create({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  equals(rendered, 1, 'rendered the child once');
  equals(parentRendered, 1);
  equals(view.$('div').length, 1);

  SC.run(function() {
    view.rerender();
  });

  equals(rendered, 2, 'rendered the child twice');
  equals(parentRendered, 2);
  equals(view.$('div').length, 1);

  view.destroy();
});

test("should render child views with a different tagName", function() {
  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;

  var view = SC.ContainerView.create({
    childViews: ["child"],

    child: SC.View.create({
      tagName: 'aside'
    })
  });

  view.createElement();
  equals(view.$('aside').length, 1);
});

test("should hide views when isVisible is false", function() {
  var view = SC.View.create({
    isVisible: false
  });

  SC.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "the view is hidden");

  set(view, 'isVisible', true);
  ok(view.$().is(':visible'), "the view is visible");
  view.remove();
});

test("should hide element if isVisible is false before element is created", function() {
  var view = SC.View.create({
    isVisible: false
  });

  ok(!get(view, 'isVisible'), "precond - view is not visible");

  set(view, 'template', function() { return "foo"; });

  SC.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "should be hidden");

  view.remove();
  set(view, 'isVisible', true);

  SC.run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "view should be visible");

  SC.run(function() {
    view.remove();
  });
});

test("should add sc-view to views", function() {
  var view = SC.View.create();

  view.createElement();
  ok(view.$().hasClass('sc-view'), "the view has sc-view");
});

test("should not add role attribute unless one is specified", function() {
  var view = SC.View.create();

  view.createElement();
  ok(view.$().attr('role') === undefined, "does not have a role attribute");
});
