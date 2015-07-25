import EmberView from "ember-views/views/view";
import Registry from "container/registry";
import compile from "ember-template-compiler/system/compile";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var registry, container, view;

QUnit.module('ember-htmlbars: compat - makeViewHelper compat', {
  setup() {
    registry = new Registry();
    container = registry.container();
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('makeViewHelper', function() {
  expect(2);

  var ViewHelperComponent = Component.extend({
    layout: compile('woot!')
  });

  var helper;
  expectDeprecation(function() {
    helper = makeViewHelper(ViewHelperComponent);
  }, '`Ember.Handlebars.makeViewHelper` and `Ember.HTMLBars.makeViewHelper` are deprecated. Please refactor to normal component usage.');

  registry.register('helper:view-helper', helper);

  view = EmberView.extend({
    template: compile('{{view-helper}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'woot!');
});
