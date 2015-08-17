import EmberView from 'ember-views/views/view';
import { Registry } from 'ember-runtime/system/container';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';

var registry, container, view;

QUnit.module('ember-htmlbars: components for void elements', {
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

QUnit.test('a void element does not have childNodes', function() {
  var component;
  registry.register('component:x-foo', Component.extend({
    tagName: 'input',

    init() {
      this._super(...arguments);
      component = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{x-foo}}')
  });

  runAppend(view);

  deepEqual(component.element.childNodes.length, 0, 'no childNodes are added for `<input>`');
});
