// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals, context, ok, same, precondition */

// NOTE: it is very important to make sure that the layer is not created
// until the view is actually visible in the window.

module("SC.View#layer");

test("returns null if the view has no layer and no parent view", function() {
  var view = SC.View.create() ;
  equals(view.get('parentView'), null, 'precond - has no parentView');
  equals(view.get('layer'), null, 'has no layer');
});

test("returns null if the view has no layer and parent view has no layer", function() {
  var parent = SC.View.create({
     childViews: [ SC.View.extend() ]
  });
  var view = parent.childViews[0];

  equals(view.get('parentView'), parent, 'precond - has parent view');
  equals(parent.get('layer'), null, 'parentView has no layer');
  equals(view.get('layer'), null, ' has no layer');
});

test("returns layer if you set the value", function() {
  var view = SC.View.create();
  equals(view.get('layer'), null, 'precond- has no layer');

  var dom = document.createElement('div');
  view.set('layer', dom);

  equals(view.get('layer'), dom, 'now has set layer');

  dom = null;
});

var parent, child, parentDom, childDom ;
module("SC.View#layer - autodiscovery", {
  setup: function() {

    parent = SC.View.create({
       childViews: [ SC.View.extend({
         // redefine this method in order to isolate testing of layer prop.
         // simple version just returns firstChild of parentLayer.
         findLayerInParentLayer: function(parentLayer) {
           return parentLayer.firstChild;
         }
       }) ]
    });
    child = parent.childViews[0];

    // setup parent/child dom
    parentDom = document.createElement('div');
    childDom = document.createElement('div');
    parentDom.appendChild(childDom);

    // set parent layer...
    parent.set('layer', parentDom);
  },

  teardown: function() {
    parent = child = parentDom = childDom = null ;
  }
});

test("discovers layer if has no layer but parent view does have layer", function() {
  equals(parent.get('layer'), parentDom, 'precond - parent has layer');
  ok(!!parentDom.firstChild, 'precond - parentDom has first child');

  equals(child.get('layer'), childDom, 'view discovered child');
});

test("once its discovers layer, returns the same element, even if you remove it from the parent view", function() {
  equals(child.get('layer'), childDom, 'precond - view discovered child');
  parentDom.removeChild(childDom) ;

  equals(child.get('layer'), childDom, 'view kept layer cached (i.e. did not do a discovery again)');
});

module("SC.View#layer - destroying");

test("returns null again if it has layer and layer is destroyed");

test("returns null again if parent view's layer is destroyed");

var pane, view ;
module("SC.View#$", {
  setup: function() {
    pane = SC.Pane.design()
      .childView(SC.View.design({
        render: function(context, firstTime) {
          context.push('<span></span>');
        }
      })).create();

    view = pane.childViews[0];

    SC.RunLoop.begin();
    pane.append(); // add to create layer...
    SC.RunLoop.end();
  },

  teardown: function() {
    SC.RunLoop.begin();
    pane.remove();
    SC.RunLoop.end();
  }
});

test("returns an empty CQ object if no layer", function() {
  var v = SC.View.create();
  ok(!v.get('layer'), 'precond - should have no layer');
  equals(v.$().size(), 0, 'should return empty CQ object');
  equals(v.$('span').size(), 0, 'should return empty CQ object even if filter passed');
});

test("returns CQ object selecting layer if provided", function() {
  ok(view.get('layer'), 'precond - should have layer');

  var cq = view.$();
  equals(cq.size(), 1, 'view.$() should have one element');
  equals(cq.get(0), view.get('layer'), 'element should be layer');
});

test("returns CQ object selecting element inside layer if provided", function() {
  ok(view.get('layer'), 'precond - should have layer');

  var cq = view.$('span');
  equals(cq.size(), 1, 'view.$() should have one element');
  equals(cq.get(0).parentNode, view.get('layer'), 'element should be in layer');
});

test("returns empty CQ object if filter passed that does not match item in parent", function() {
  ok(view.get('layer'), 'precond - should have layer');

  var cq = view.$('body'); // would normally work if not scoped to view
  equals(cq.size(), 0, 'view.$(body) should have no elements');
});

var parentView;

module("Notifies that layer has changed whenever re-render", {

  setup: function () {
    parentView = SC.View.create({
      childViews: ['a', 'b', SC.View],

      containerLayer: function () {
        return this.$('._wrapper')[0];
      }.property('layer').cacheable(),

      a: SC.View,
      b: SC.View,

      render: function (context) {
        context = context.begin().addClass('_wrapper');
        this.renderChildViews(context);
        context = context.end();
      }
    });
  },

  teardown: function () {
    parentView.destroy();
    parentView = null;
  }

});

/**
  If the containerLayer property is cached, then when the view re-renders and the original container layer
  element is lost, the containerLayer property will be invalid.  Instead, whenever the view updates,
  we have to indicate that the 'layer' property has changed.
  */
test("containerLayer should be able to be dependent on layer so that it invalidates when updated", function () {
  var containerLayer;

  // Render the parent view and attach.
  parentView.createLayer();
  parentView._doAttach(document.body);

  // Get the container layer.
  containerLayer = parentView.get('containerLayer');

  // Rerender the view.
  SC.run(function () {
    parentView.displayDidChange();
  });

  ok(containerLayer !== parentView.get('containerLayer'), "The container layer should not be the same anymore.");
});
