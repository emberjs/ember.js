/*globals EmberDev */

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";

import EmberView from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";

var parentView, view;

QUnit.module("Ember.View#element", {
  teardown() {
    run(function() {
      if (parentView) { parentView.destroy(); }
      view.destroy();
    });
  }
});

QUnit.test("returns null if the view has no element and no parent view", function() {
  view = EmberView.create();
  equal(get(view, 'parentView'), null, 'precond - has no parentView');
  equal(get(view, 'element'), null, 'has no element');
});

QUnit.test("returns null if the view has no element and parent view has no element", function() {
  expectDeprecation("Setting `childViews` on a Container is deprecated.");

  parentView = ContainerView.create({
    childViews: [EmberView.extend()]
  });
  view = get(parentView, 'childViews').objectAt(0);

  equal(get(view, 'parentView'), parentView, 'precond - has parent view');
  equal(get(parentView, 'element'), null, 'parentView has no element');
  equal(get(view, 'element'), null, ' has no element');
});

QUnit.test("returns element if you set the value", function() {
  view = EmberView.create();
  equal(get(view, 'element'), null, 'precond- has no element');

  var dom = document.createElement('div');
  set(view, 'element', dom);

  equal(get(view, 'element'), dom, 'now has set element');
});

if (EmberDev && !EmberDev.runningProdBuild) {
  QUnit.test("should not allow the elementId to be changed after inserted", function() {
    view = EmberView.create({
      elementId: 'one'
    });

    run(function() {
      view.appendTo('#qunit-fixture');
    });

    throws(function() {
      view.set('elementId', 'two');
    }, "raises elementId changed exception");

    equal(view.get('elementId'), 'one', 'elementId is still "one"');
  });
}
