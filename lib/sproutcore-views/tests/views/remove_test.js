// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// .......................................................
// removeChild()
//

var parent, child;
module("SC.View#removeChild", {
  setup: function() {
    parent = SC.View.create({ childViews: [SC.View] });
    child = parent.childViews[0];
  }
});

test("returns receiver", function() {
  equals(parent.removeChild(child), parent, 'receiver');
});

test("removes child from parent.childViews array", function() {
  ok(parent.childViews.indexOf(child)>=0, 'precond - has child in childViews array before remove');
  parent.removeChild(child);
  ok(parent.childViews.indexOf(child)<0, 'removed child');
});

test("sets parentView property to null", function() {
  ok(child.get('parentView'), 'precond - has parentView');
  parent.removeChild(child);
  ok(!child.get('parentView'), 'parentView is now null');
});

// .......................................................
// removeAllChildren()
//
var view;
module("SC.View#removeAllChildren", {
 setup: function() {
  view = SC.View.create({
    childViews: [SC.View, SC.View, SC.View]
  });
 }
});

test("removes all child views", function() {
  equals(view.childViews.length, 3, 'precond - has child views');

  view.removeAllChildren();
  equals(view.childViews.length, 0, 'removed all children');
});

test("returns receiver", function() {
  equals(view.removeAllChildren(), view, 'receiver');
});

// .......................................................
// removeFromParent()
//
module("SC.View#removeFromParent");

test("removes view from parent view", function() {
  var parent = SC.View.create({ childViews: [SC.View] });
  var child = parent.childViews[0];
  ok(child.get('parentView'), 'precond - has parentView');

  child.removeFromParent();
  ok(!child.get('parentView'), 'no longer has parentView');
  ok(parent.childViews.indexOf(child)<0, 'no longer in parent childViews');
});

test("returns receiver", function() {
  equals(child.removeFromParent(), child, 'receiver');
});

test("does nothing if not in parentView", function() {
  var callCount = 0;
  var child = SC.View.create();

  // monkey patch for testing...
  ok(!child.get('parentView'), 'precond - has no parent');

  child.removeFromParent();
});




