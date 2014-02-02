// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module, test, equals, ok */


module("SC.View#destroyLayer");

test("it if has no layer, does nothing", function () {
  var callCount = 0;
  var view = SC.View.create({
    willDestroyLayer: function () { callCount++; }
  });
  ok(!view.get('layer'), 'precond - does NOT have layer');

  view.destroyLayer();
  equals(callCount, 0, 'did not invoke callback');
});

test("if it has a layer, calls willDestroyLayer on receiver and child views then deletes the layer", function () {
  var callCount = 0;

  var view = SC.View.create({
    willDestroyLayer: function () { callCount++; },
    childViews: [SC.View.extend({
      // no willDestroyLayer here... make sure no errors are thrown
      childViews: [SC.View.extend({
        willDestroyLayer: function () { callCount++; }
      })]
    })]
  });
  view.createLayer();
  ok(view.get('layer'), 'precond - view has layer');

  view.destroyLayer();
  equals(callCount, 2, 'invoked destroy layer');
  ok(!view.get('layer'), 'view no longer has layer');
});

test("if it has a layer, calls willDestroyLayerMixin on receiver and child views if defined (comes from mixins)", function () {
  var callCount = 0;

  // make sure this will call both mixins...
  var mixinA = {
    willDestroyLayerMixin: function () { callCount++; }
  };

  var mixinB = {
    willDestroyLayerMixin: function () { callCount++; }
  };

  var view = SC.View.create(mixinA, mixinB, {
    childViews: [SC.View.extend(mixinA, mixinB, {
      childViews: [SC.View.extend(mixinA)]
    })]
  });
  view.createLayer();
  view.destroyLayer();
  equals(callCount, 5, 'invoked willDestroyLayerMixin on all mixins');
});

test("returns receiver", function () {
  var view = SC.View.create().createLayer();
  equals(view.destroyLayer(), view, 'returns receiver');
});

/**
  There is a bug that if childView layers are rendered when the parentView's
  layer is created, the `layer` property on the childView will not be
  cached.  What occurs is that if the childView is removed from the parent
  view without ever having its `layer` requested, then when it comes time
  to destroy the layer of the childView, it will get('layer'), which had a
  bug that only returned a layer if the view has a parent view.  However,
  since the child was removed from the parent first and then destroyed, it
  no longer has a parent view and would return undefined for its `layer`.

  This left elements in the DOM.

  UPDATE:  The addition of the SC.View statechart prevents this from happening.
*/
test("Tests that if the childView's layer was never cached and the childView is removed, it should still destroy the childView's layer", function () {
  var childView,
    layerId,
    pane,
    view;

  childView = SC.View.create({});

  layerId = childView.get('layerId');

  view = SC.View.create({
    childViews: [childView]
  });

  pane = SC.Pane.create({
    childViews: [view]
  }).append();

  ok(document.getElementById(layerId), 'child layer should be in the DOM');
  ok(!childView._view_layer, 'child view should not have cached its layer');
  view.removeChild(childView);
  // Before SC.View states, this would be the case
  // ok(document.getElementById(layerId), 'child layer should be in the DOM');
  ok(!document.getElementById(layerId), 'child layer should not be in the DOM');
  childView.destroy();
  ok(!document.getElementById(layerId), 'child layer should not be in the DOM');

  pane.remove();
  pane.destroy();
});
