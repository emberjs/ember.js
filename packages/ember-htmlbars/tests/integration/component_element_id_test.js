import EmberView from 'ember-views/views/view';
import { Registry } from 'ember-runtime/system/container';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';

var registry, container, view;

QUnit.module('ember-htmlbars: component elementId', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('passing undefined elementId results in a default elementId', function() {
  registry.register('component:x-foo', Component.extend({
    tagName: 'h1'
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{x-foo id=somethingUndefined}}')
  });

  runAppend(view);
  var foundId = view.$('h1').attr('id');
  ok(/^ember/.test(foundId), 'Has a reasonable id attribute (found id=' + foundId + ').');
});
