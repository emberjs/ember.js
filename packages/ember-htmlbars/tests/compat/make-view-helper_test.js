import EmberView from "ember-views/views/view";
import Registry from "container/registry";
import compile from "ember-template-compiler/system/compile";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var registry, container, view;

QUnit.module('ember-htmlbars: makeViewHelper compat', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('helper', { instantiate: false });
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('makeViewHelper', function() {
  expect(1);

  var ViewHelperComponent = Component.extend({
    layout: compile('woot!')
  });
  var helper = makeViewHelper(ViewHelperComponent);
  registry.register('helper:view-helper', helper);

  view = EmberView.extend({
    template: compile('{{view-helper}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'woot!');
});
