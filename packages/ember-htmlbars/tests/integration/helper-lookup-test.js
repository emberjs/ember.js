import Registry from 'container/registry';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import { helper } from 'ember-htmlbars/helper';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var registry, container, component;

QUnit.module('component - invocation', {
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
    runDestroy(component);
    registry = container = component = null;
  }
});

QUnit.test('non-dashed helpers are found', function() {
  expect(1);

  registry.register('helper:fullname', helper(function( [first, last]) {
    return `${first} ${last}`;
  }));

  component = Component.extend({
    layout: compile('{{fullname "Robert" "Jackson"}}'),
    container: container
  }).create();

  runAppend(component);

  equal(component.$().text(), 'Robert Jackson');
});
