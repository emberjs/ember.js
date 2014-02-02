// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

// .......................................................
// removeChild()
//

var parent, child;
module("SC.View#removeChild", {
	setup: function() {
		parent = SC.View.create({ childViews: [
      SC.View.extend({
        updateLayerLocationIfNeeded: CoreTest.stub('updateLayerLocationIfNeeded', SC.View.prototype.updateLayerLocationIfNeeded)
      })
    ] });
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

test("does nothing if passed null", function() {

  // monkey patch callbacks to make sure nothing runs.
  var callCount = 0;
  parent.willRemoveChild = parent.didRemoveChild = function() { callCount++; };

  parent.removeChild(null);
  equals(callCount, 0, 'did not invoke callbacks');
});

test("invokes child.willRemoveFromParent before removing if defined", function() {

  // monkey patch to test
  var callCount = 0;
  child.willRemoveFromParent = function() {
    // verify invoked BEFORE removal
    equals(child.get('parentView'), parent, 'still in parent');
    callCount++;
  };

  parent.removeChild(child);
  equals(callCount, 1, 'invoked callback');
});

test("invokes parent.willRemoveChild before removing if defined", function() {

  // monkey patch to test
  var callCount = 0;
  parent.willRemoveChild = function(view) {
    equals(view, child, 'passed child as param');

    // verify invoked BEFORE removal
    equals(child.get('parentView'), parent, 'still in parent');
    callCount++;
  };

  parent.removeChild(child);
  equals(callCount, 1, 'invoked callback');
});


test("invokes child.didRemoveFromParent AFTER removing if defined", function() {

  // monkey patch to test
  var callCount = 0;
  child.didRemoveFromParent = function(view) {
    equals(view, parent, 'passed parent as param');

    // verify invoked AFTER removal
    ok(!child.get('parentView'), 'no longer in parent');
    callCount++;
  };

  parent.removeChild(child);
  equals(callCount, 1, 'invoked callback');
});

test("invokes parent.didRemoveChild before removing if defined", function() {

  // monkey patch to test
  var callCount = 0;
  parent.didRemoveChild = function(view) {
    equals(view, child, 'passed child as param');

    // verify invoked BEFORE removal
    ok(!child.get('parentView'), 'no longer in parent');
    callCount++;
  };

  parent.removeChild(child);
  equals(callCount, 1, 'invoked callback');
});

// VERIFY LAYER CHANGES ARE DEFERRED
test("should not move layer immediately");
// , function() {

//   parent.createLayer();

// 	var parentLayer = parent.get('layer'), childLayer = child.get('layer');
//   ok(parentLayer, 'precond - parent has layer');
//   ok(childLayer, 'precond - child has layer');
//   equals(childLayer.parentNode, parentLayer, 'child layer belong to parent');

//   parent.removeChild(child);
//   equals(childLayer.parentNode, parentLayer, 'child layer belong to parent');
// });

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
  parent = SC.View.create({ childViews: [SC.View] });
  child = parent.childViews[0];
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
  child = SC.View.create();

	// monkey patch for testing...
	child.willRemoveFromParent = function() { callCount++; };
	ok(!child.get('parentView'), 'precond - has no parent');

	child.removeFromParent();
	equals(callCount, 0, 'did not invoke callback');
});


