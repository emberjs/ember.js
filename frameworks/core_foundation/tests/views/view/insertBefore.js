// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

var parent, child;
module("SC.View#insertBefore", {
	setup: function() {
	  child = SC.View.create();
	  parent = SC.View.create({
	    childViews: [SC.View]
	  });
	}
});

test("returns receiver", function() {
  equals(parent.insertBefore(child, null), parent, 'receiver');
});

test("makes set child.parentView = to new parent view", function() {
	ok(child.get('parentView')!==parent, 'precond - parent is not child.parentView yet');

	// add observer to make sure property change triggers
	var callCount = 0;
	child.addObserver('parentView', function() {
	  callCount++;
	});

	parent.insertBefore(child, null);
	equals(child.get('parentView'), parent, 'parent is child.parentView');
	equals(callCount, 1, 'observer did fire');
});

test("insertBefore(child, null) appends child to end of parent.childView's array", function() {
	parent.insertBefore(child, null);
	equals(parent.childViews[parent.childViews.length-1], child, 'child is last childView');
});

test("insertBefore(child, otherChild) inserts child before other child view", function() {

  var otherChild = parent.childViews[0]; // get current first child
  ok(otherChild, 'precond - otherChild is not null');
  parent.insertBefore(child, otherChild);
  equals(parent.childViews[0], child, 'child inserted before other child');
});

test("invokes willAddChild() on receiver if defined before adding child" ,function() {

  // monkey patch to test
  var callCount = 0;
  var otherChild = parent.childViews[0];
  parent.willAddChild = function(newChild, beforeView) {

  	// verify params
  	equals(newChild, child, 'passed newChild');
  	equals(beforeView, otherChild, 'passed beforeView');

  	// verify this is called BEFORE the view is added
  	ok(parent.childViews.indexOf(child)<0, 'should not have child yet');
  	ok(child.get('parentView')!==parent, 'childView not changed yet either');
  	callCount++;
  };


  parent.insertBefore(child, otherChild);
  equals(callCount, 1, 'invoked');
});

test("invokes willAddToParent() on child view if defined before adding child" ,function() {

  // monkey patch to test
  var callCount = 0;
  var otherChild = parent.childViews[0];
  child.willAddToParent = function(parentView, beforeView) {

  	// verify params
  	equals(parentView, parent, 'passed parent');
  	equals(beforeView, otherChild, 'passed beforeView');

  	// verify this is called BEFORE the view is added
  	ok(parent.childViews.indexOf(child)<0, 'should not have child yet');
  	ok(child.get('parentView')!==parent, 'childView not changed yet either');
  	callCount++;
  };


  parent.insertBefore(child, otherChild);
  equals(callCount, 1, 'invoked');
});

test("invokes didAddChild() on receiver if defined after adding child" ,function() {

  // monkey patch to test
  var callCount = 0;
  var otherChild = parent.childViews[0];
  parent.didAddChild = function(newChild, beforeView) {

  	// verify params
  	equals(newChild, child, 'passed newChild');
  	equals(beforeView, otherChild, 'passed beforeView');

  	// verify this is called AFTER the view is added
  	ok(parent.childViews.indexOf(child)>=0, 'should have child');
  	ok(child.get('parentView')===parent, 'childView should have new parentView');
  	callCount++;
  };

  SC.RunLoop.begin();
  parent.insertBefore(child, otherChild);
  SC.RunLoop.end();

  equals(callCount, 1, 'invoked');
});

test("invokes didAddToParent() on child view if defined after adding child" ,function() {

  // monkey patch to test
  var callCount = 0;
  var otherChild = parent.childViews[0];
  child.didAddToParent = function(parentView, beforeView) {

  	// verify params
  	equals(parentView, parent, 'passed parent');
  	equals(beforeView, otherChild, 'passed beforeView');

  	// verify this is called AFTER the view is added
  	ok(parent.childViews.indexOf(child)>=0, 'should have child');
  	ok(child.get('parentView')===parent, 'childView should have new parentView');
  	callCount++;
  };

  SC.RunLoop.begin();
  parent.insertBefore(child, otherChild);
  SC.RunLoop.end();

  equals(callCount, 1, 'invoked');
});

// VERIFY LAYER CHANGES ARE DEFERRED
test("should not move layer immediately");
// , function() {

//   parent.createLayer();
//   child.createLayer();

//   ok(parent.get('layer'), 'precond - parent has layer');
//   ok(child.get('layer'), 'precond - child has layer');

//   parent.insertBefore(child, null);
//   ok(child.get('layer').parentNode !== parent.get('layer'), 'did not move layer');

// });

// .......................................................
// appendChild()
//

module('SC.View#appendChild', {
  setup: function() {
    parent = SC.View.create({
      childViews: [SC.View, SC.View]
    });

    child = SC.View.create();
  }
});

test("returns receiver", function() {
  equals(parent.appendChild(child, null), parent, 'receiver');
});


test("should add child to end of childViews", function() {
  parent.appendChild(child);
  equals(parent.childViews[parent.childViews.length-1], child, 'child is last child view');
});


