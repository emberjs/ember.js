// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

// ..........................................................
// createChildViews()
//
var view, parentDom, childDom, layerId ;
module("SC.View#findLayerInParentLayer", {
  setup: function() {

    layerId = 'foo-123';

    // manually construct a test layer.  next childDom a few layers deep
    childDom = document.createElement('div');
    SC.$(childDom).attr('id', layerId);

    var intermediate = document.createElement('div');
    intermediate.appendChild(childDom);

    parentDom = document.createElement('div');
    parentDom.appendChild(intermediate);
    intermediate = null;


    // setup view w/ layerId
    view = SC.View.create({ layerId: layerId });
  },

  teardown: function() {
    view.destroy();
    view = parentDom = childDom = layerId = null;
  }
});

test("discovers layer by finding element with matching layerId - when DOM is in document already", function() {
  document.body.appendChild(parentDom);
  equals(view.findLayerInParentLayer(parentDom), childDom, 'should find childDom');
  document.body.removeChild(parentDom); // cleanup or else next test may fail
});

test("discovers layer by finding element with matching layerId - when parent DOM is NOT in document", function() {
  if(parentDom.parentNode) equals(parentDom.parentNode.nodeType, 11, 'precond - NOT in parent doc');
  else equals(parentDom.parentNode, null, 'precond - NOT in parent doc');
  equals(view.findLayerInParentLayer(parentDom), childDom, 'found childDom');
});

