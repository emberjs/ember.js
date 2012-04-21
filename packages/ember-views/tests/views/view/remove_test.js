// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get, getPath = Ember.getPath;
var indexOf = Ember.ArrayUtils.indexOf;

// .......................................................
// removeChild()
//

var parentView, child;
module("Ember.View#removeChild", {
  setup: function() {
    parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
    child = get(parentView, 'childViews').objectAt(0);
  }
});

test("returns receiver", function() {
  equal(parentView.removeChild(child), parentView, 'receiver');
});

test("removes child from parent.childViews array", function() {
  ok(indexOf(get(parentView, 'childViews'), child)>=0, 'precond - has child in childViews array before remove');
  parentView.removeChild(child);
  ok(indexOf(get(parentView, 'childViews'), child)<0, 'removed child');
});

test("sets parentView property to null", function() {
  ok(get(child, 'parentView'), 'precond - has parentView');
  parentView.removeChild(child);
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
  equal(getPath(view, 'childViews.length'), 3, 'precond - has child views');

  view.removeAllChildren();
  equal(getPath(view, 'childViews.length'), 0, 'removed all children');
});

test("returns receiver", function() {
  equal(view.removeAllChildren(), view, 'receiver');
});

// .......................................................
// removeFromParent()
//
module("Ember.View#removeFromParent");

test("removes view from parent view", function() {
  var parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
  var child = getPath(parentView, 'childViews').objectAt(0);
  ok(get(child, 'parentView'), 'precond - has parentView');

  parentView.createElement();

  ok(parentView.$('div').length, "precond - has a child DOM element");

  child.removeFromParent();
  ok(!get(child, 'parentView'), 'no longer has parentView');
  ok(indexOf(get(parentView, 'childViews'), child)<0, 'no longer in parent childViews');
  equal(parentView.$('div').length, 0, "removes DOM element from parent");
});

test("returns receiver", function() {
  var parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
  var child = getPath(parentView, 'childViews').objectAt(0);
  equal(child.removeFromParent(), child, 'receiver');
});

test("does nothing if not in parentView", function() {
  var callCount = 0;
  var child = Ember.View.create();

  // monkey patch for testing...
  ok(!get(child, 'parentView'), 'precond - has no parent');

  child.removeFromParent();
});


test("the DOM element is gone after doing append and remove in two separate runloops", function() {
  var view = Ember.View.create();
  Ember.run(function() {
    view.append();
  });
  Ember.run(function() {
    view.remove();
  });

  var viewElem = Ember.$('#'+get(view, 'elementId'));
  ok(viewElem.length === 0, "view's element doesn't exist in DOM");
});

test("the DOM element is gone after doing append and remove in a single runloop", function() {
  var view = Ember.View.create();
  Ember.run(function() {
    view.append();
    view.remove();
  });

  var viewElem = Ember.$('#'+get(view, 'elementId'));
  ok(viewElem.length === 0, "view's element doesn't exist in DOM");
});

