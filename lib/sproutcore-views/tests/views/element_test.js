// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("SC.View#element");

test("returns null if the view has no element and no parent view", function() {
  var view = SC.View.create() ;
  equals(view.get('parentView'), null, 'precond - has no parentView');
  equals(view.get('element'), null, 'has no element');
});

test("returns null if the view has no element and parent view has no element", function() {
  var parent = SC.View.create({
    childViews: [ SC.View.extend() ]
  });
  var view = parent.childViews[0];

  equals(view.get('parentView'), parent, 'precond - has parent view');
  equals(parent.get('element'), null, 'parentView has no element');
  equals(view.get('element'), null, ' has no element');
});

test("returns element if you set the value", function() {
  var view = SC.View.create();
  equals(view.get('element'), null, 'precond- has no element');

  var dom = document.createElement('div');
  view.set('element', dom);

  equals(view.get('element'), dom, 'now has set element');
});

var parent, child, parentDom, childDom ;

module("SC.View#element - autodiscovery", {
  setup: function() {

    parent = SC.View.create({
      childViews: [ SC.View.extend({
        elementId: 'child-view'
      }) ]
    });

    child = parent.childViews[0];

    // setup parent/child dom
    parentDom = SC.$("<div><div id='child-view'></div></div>")[0];

    // set parent element...
    parent.set('element', parentDom);
  },

  teardown: function() {
    parent = child = parentDom = childDom = null ;
  }
});

test("discovers element if has no element but parent view does have element", function() {
  equals(parent.get('element'), parentDom, 'precond - parent has element');
  ok(parentDom.firstChild, 'precond - parentDom has first child');

  equals(child.$().attr('id'), 'child-view', 'view discovered child');
});

