// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

// .......................................................
// layoutChildViews()
//
module("SC.View#layoutChildViews");

test("calls renderLayout() on child views on views that need layout if they have a layer", function() {

	var callCount = 0 ;
	var ChildView = SC.View.extend({
		updateLayout: function(context) { callCount++; }
	});

	var view = SC.View.create({
		childViews: [ChildView, ChildView, ChildView]
	});

	var cv1 = view.childViews[0];
	var cv2 = view.childViews[1];

	// add to set...
	view.layoutDidChangeFor(cv1);
	view.layoutDidChangeFor(cv2);

	view.layoutChildViews();
	equals(callCount, 2, 'updateLayout should be called on two dirty child views');

	// Clean up.
	view.destroy();
});

// .......................................................
// updateLayout()
//
module("SC.View#updateLayout");

test("if view has layout, calls _doUpdateLayoutStyle", function() {

	// NOTE: renderLayout() is also called when a view's
	// layer is first created.  We use isTesting below to
	// avoid running the renderLayout() test code until we
	// are actually doing layout.
	var callCount = 0, isTesting = NO ;
	var view = SC.View.create({
		_doUpdateLayoutStyle: function() {
			callCount++;
		}
	});

	view.createLayer(); // we need a layer
	ok(view.get('layer'), 'precond - should have a layer');

	view.updateLayout();
	equals(callCount, 0, 'should not call _doUpdateLayoutStyle() because the view isn\'t shown');

	view.updateLayout(true);
	equals(callCount, 1, 'should call _doUpdateLayoutStyle() because we force it');

	// Clean up.
	view.destroy();
});

test("if view has NO layout, should not call renderLayout", function() {

	// NOTE: renderLayout() is also called when a view's
	// layer is first created.  We use isTesting below to
	// avoid running the renderLayout() test code until we
	// are actually doing layout.
	var callCount = 0, isTesting = NO ;
	var view = SC.View.create({
		renderLayout: function(context) {
			if (!isTesting) return ;
			callCount++;
		}
	});

	ok(!view.get('layer'), 'precond - should NOT have a layer');

	isTesting= YES ;
	view.updateLayout();
	equals(callCount, 0, 'should NOT call renderLayout()');

	// Clean up.
	view.destroy();
});

test("returns receiver", function() {
	var view = SC.View.create();
	equals(view.updateLayout(), view, 'should return receiver');

	// Clean up.
	view.destroy();
});

// .......................................................
//  renderLayout()
//
module('SC.View#renderLayout');

test("adds layoutStyle property to passed context", function() {

	var view = SC.View.create({
		// mock style for testing...
		layoutStyle: { width: 50, height: 50 }
	});
	var context = view.renderContext();

	ok(context.styles().width !== 50, 'precond - should NOT have width style');
	ok(context.styles().height !== 50, 'precond - should NOT have height style');


	view.renderLayout(context);

	equals(context.styles().width, 50, 'should have width style');
	equals(context.styles().height, 50, 'should have height style');

	// Clean up.
	view.destroy();
});

// .......................................................
// layoutChildViewsIfNeeded()
//
var view, callCount ;
module('SC.View#layoutChildViewsIfNeeded', {
	setup: function() {
		callCount = 0;
		view = SC.View.create({
			layoutChildViews: function() { callCount++; }
		});
	},
	teardown: function() {
		// Clean up.
		view.destroy();
		view = null;
	}
});

test("calls layoutChildViews() if childViewsNeedLayout and isVisibleInWindow & sets childViewsNeedLayout to NO", function() {

	view.childViewsNeedLayout = YES ;
	view.isVisibleInWindow = YES ;
	view.layoutChildViewsIfNeeded();
	equals(callCount, 1, 'should call layoutChildViews()');
	equals(view.get('childViewsNeedLayout'),NO,'should set childViewsNeedLayout to NO');
});

test("does not call layoutChildViews() if childViewsNeedLayout is NO", function() {

	view.childViewsNeedLayout = NO ;
	view.isVisibleInWindow = YES ;
	view.layoutChildViewsIfNeeded();
	equals(callCount, 0, 'should NOT call layoutChildViews()');
});

test("returns receiver", function() {
	equals(view.layoutChildViewsIfNeeded(), view, 'should return receiver');
});


