// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

module("SC.View#element");

test("returns null if the view has no element and no parent view", function() {
  var view = SC.View.create() ;
  equals(get(view, 'parentView'), null, 'precond - has no parentView');
  equals(get(view, 'element'), null, 'has no element');
});

test("returns null if the view has no element and parent view has no element", function() {
  var parent = SC.View.create({
    childViews: [ SC.View.extend() ]
  });
  var view = parent.childViews[0];

  equals(get(view, 'parentView'), parent, 'precond - has parent view');
  equals(get(parent, 'element'), null, 'parentView has no element');
  equals(get(view, 'element'), null, ' has no element');
});

test("returns element if you set the value", function() {
  var view = SC.View.create();
  equals(get(view, 'element'), null, 'precond- has no element');

  var dom = document.createElement('div');
  set(view, 'element', dom);

  equals(get(view, 'element'), dom, 'now has set element');
});

var parent, child, parentDom, childDom ;

module("SC.View#element - autodiscovery", {
  setup: function() {

    parent = SC.ContainerView.create({
      childViews: [ SC.View.extend({
        elementId: 'child-view'
      }) ]
    });

    child = parent.childViews[0];

    // setup parent/child dom
    parentDom = SC.$("<div><div id='child-view'></div></div>")[0];

    // set parent element...
    set(parent, 'element', parentDom);
  },

  teardown: function() {
    parent = child = parentDom = childDom = null ;
  }
});

test("discovers element if has no element but parent view does have element", function() {
  equals(get(parent, 'element'), parentDom, 'precond - parent has element');
  ok(parentDom.firstChild, 'precond - parentDom has first child');

  equals(child.$().attr('id'), 'child-view', 'view discovered child');
});

