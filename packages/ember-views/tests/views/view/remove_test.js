// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get, getPath = Ember.getPath;

// .......................................................
// removeChild()
//

var parent, child;
module("Ember.View#removeChild", {
  setup: function() {
    parent = Ember.ContainerView.create({ childViews: [Ember.View] });
    child = get(parent, 'childViews').objectAt(0);
  }
});

test("returns receiver", function() {
  equals(parent.removeChild(child), parent, 'receiver');
});

test("removes child from parent.childViews array", function() {
  ok(get(parent, 'childViews').indexOf(child)>=0, 'precond - has child in childViews array before remove');
  parent.removeChild(child);
  ok(get(parent, 'childViews').indexOf(child)<0, 'removed child');
});

test("sets parentView property to null", function() {
  ok(get(child, 'parentView'), 'precond - has parentView');
  parent.removeChild(child);
  ok(!get(child, 'parentView'), 'parentView is now null');
});

// .......................................................
// removeAllChildren()
//
var view;
module("Ember.View#removeAllChildren", {
 setup: function() {
  view = Ember.ContainerView.create({
    childViews: [Ember.View, Ember.View, Ember.View]
  });
 }
});

test("removes all child views", function() {
  equals(getPath(view, 'childViews.length'), 3, 'precond - has child views');

  view.removeAllChildren();
  equals(getPath(view, 'childViews.length'), 0, 'removed all children');
});

test("returns receiver", function() {
  equals(view.removeAllChildren(), view, 'receiver');
});

// .......................................................
// removeFromParent()
//
module("Ember.View#removeFromParent");

test("removes view from parent view", function() {
  var parent = Ember.ContainerView.create({ childViews: [Ember.View] });
  var child = getPath(parent, 'childViews').objectAt(0);
  ok(get(child, 'parentView'), 'precond - has parentView');

  parent.createElement();

  ok(parent.$('div').length, "precond - has a child DOM element");

  child.removeFromParent();
  ok(!get(child, 'parentView'), 'no longer has parentView');
  ok(get(parent, 'childViews').indexOf(child)<0, 'no longer in parent childViews');
  equals(parent.$('div').length, 0, "removes DOM element from parent");
});

test("returns receiver", function() {
  var parent = Ember.ContainerView.create({ childViews: [Ember.View] });
  var child = getPath(parent, 'childViews').objectAt(0);
  equals(child.removeFromParent(), child, 'receiver');
});

test("does nothing if not in parentView", function() {
  var callCount = 0;
  var child = Ember.View.create();

  // monkey patch for testing...
  ok(!get(child, 'parentView'), 'precond - has no parent');

  child.removeFromParent();
});




