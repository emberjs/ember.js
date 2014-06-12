import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";

import jQuery from "ember-views/system/jquery";
import EmberView from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";

var parentView, child, parentDom, childDom, view;

QUnit.module("Ember.View#element", {
  teardown: function() {
    run(function() {
      if (parentView) { parentView.destroy(); }
      view.destroy();
    });
  }
});

test("returns null if the view has no element and no parent view", function() {
  view = EmberView.create() ;
  equal(get(view, 'parentView'), null, 'precond - has no parentView');
  equal(get(view, 'element'), null, 'has no element');
});

test("returns null if the view has no element and parent view has no element", function() {
  parentView = ContainerView.create({
    childViews: [ EmberView.extend() ]
  });
  view = get(parentView, 'childViews').objectAt(0);

  equal(get(view, 'parentView'), parentView, 'precond - has parent view');
  equal(get(parentView, 'element'), null, 'parentView has no element');
  equal(get(view, 'element'), null, ' has no element');
});

test("returns element if you set the value", function() {
  view = EmberView.create();
  equal(get(view, 'element'), null, 'precond- has no element');

  var dom = document.createElement('div');
  set(view, 'element', dom);

  equal(get(view, 'element'), dom, 'now has set element');
});


QUnit.module("Ember.View#element - autodiscovery", {
  setup: function() {
    parentView = ContainerView.create({
      childViews: [ EmberView.extend({
        elementId: 'child-view'
      }) ]
    });

    child = get(parentView, 'childViews').objectAt(0);

    // setup parent/child dom
    parentDom = jQuery("<div><div id='child-view'></div></div>")[0];

    // set parent element...
    set(parentView, 'element', parentDom);
  },

  teardown: function() {
    run(function() {
      parentView.destroy();
      if (view) { view.destroy(); }
    });
    parentView = child = parentDom = childDom = null ;
  }
});

test("discovers element if has no element but parent view does have element", function() {
  equal(get(parentView, 'element'), parentDom, 'precond - parent has element');
  ok(parentDom.firstChild, 'precond - parentDom has first child');

  equal(child.$().attr('id'), 'child-view', 'view discovered child');
});

test("should not allow the elementId to be changed after inserted", function() {
  view = EmberView.create({
    elementId: 'one'
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  raises(function() {
    view.set('elementId', 'two');
  }, "raises elementId changed exception");

  equal(view.get('elementId'), 'one', 'elementId is still "one"');
});
