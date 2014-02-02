// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ */

// ..........................................................
// createLayer()
//
module("SC.View#createLayer");

test("returns the receiver", function() {
  var v = SC.View.create();
  equals(v.createLayer(), v, 'returns receiver');
  v.destroy();
});

test("calls renderToContext() and sets layer to resulting element", function() {
  var v = SC.View.create({
    tagName: 'span',

    renderToContext: function(context, firstTime) {
      context.push("foo");
    }
  });

  equals(v.get('layer'), null, 'precondition - has no layer');
  v.createLayer();

  var elem = v.get('layer');
  ok(!!elem, 'has element now');
  equals(elem.innerHTML, 'foo', 'has innerHTML from context');
  equals(elem.tagName.toString().toLowerCase(), 'span', 'has tagName from view');
  elem = null ;
  v.destroy();
});

test("invokes didCreateLayer() on receiver and all child views", function() {
  var callCount = 0, mixinCount = 0;
  var v = SC.View.create({

    didCreateLayer: function() { callCount++; },
    didCreateLayerMixin: function() { mixinCount++; },

    childViews: [SC.View.extend({
      didCreateLayer: function() { callCount++; },
      childViews: [SC.View.extend({
        didCreateLayer: function() { callCount++; },
        didCreateLayerMixin: function() { mixinCount++; }
      }), SC.View.extend({ /* no didCreateLayer */ })]
    })]
  });

  // verify setup...
  ok(v.didCreateLayer, 'precondition - has root');
  ok(v.childViews[0].didCreateLayer, 'precondition - has firstChild');
  ok(v.childViews[0].childViews[0].didCreateLayer, 'precondition - has nested child');
  ok(!v.get('layer'), 'has no layer');

  v.createLayer();
  equals(callCount, 3, 'did invoke all methods');
  equals(mixinCount, 2, 'did invoke all mixin methods');
  v.destroy();
});

test("generated layer include HTML from child views as well", function() {
  var v = SC.View.create({
    childViews: [ SC.View.extend({ layerId: "foo" })]
  });

  v.createLayer();
  ok(Q$('#foo', v.get('layer')).get(0), 'has element with child layerId');
  v.destroy();
});

test("does NOT assign layer to child views immediately", function() {
  var v = SC.View.create({
    childViews: [ SC.View.extend({ layerId: "foo" })]
  });
  v.createLayer();
  ok(!v.childViews[0]._view_layer, 'has no layer yet');
  v.destroy();
});

// ..........................................................
// USE CASES
//

// when view is first created, createLayer is NOT called

// when view is added to parent view, and parent view is already visible in
// window, layer is created just before adding it to the DOM

// when a pane is added to the window, the pane layer is created.

// when a pane with an exiting layer is removed from the DOM, the layer is removed from the DOM, but it is not destroyed.

// what if we move a view from a parentView that has a layer to a parentView that does NOT have a layer.   Delete layer.

// what if a move a view from a parentView that does NOT have a layer to a parentView that DOES have a layer.
