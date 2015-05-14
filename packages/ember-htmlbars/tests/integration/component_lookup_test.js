import EmberView from "ember-views/views/view";
import Registry from "container/registry";
import compile from "ember-template-compiler/system/compile";
import ComponentLookup from 'ember-views/component_lookup';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var registry, container, view;

QUnit.module('component - lookup', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.optionsForType('helper', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('dashless components should not be found', function() {
  expect(1);

  registry.register('template:components/dashless', compile('Do not render me!'));

  view = EmberView.extend({
    template: compile('{{dashless}}'),
    container: container
  }).create();

  expectAssertion(function() {
    runAppend(view);
  }, /You canot use 'dashless' as a component name. Component names must contain a hyphen./);
});
