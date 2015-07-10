import EmberView from 'ember-views/views/view';
import Registry from 'container/registry';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import RenderEnv from 'ember-htmlbars/system/render-env';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import run from 'ember-metal/run_loop';

var registry, container, view, components;

function commonSetup() {
  registry = new Registry();
  container = registry.container();
  registry.optionsForType('component', { singleton: false });
  registry.optionsForType('view', { singleton: false });
  registry.optionsForType('template', { instantiate: false });
  registry.optionsForType('helper', { instantiate: false });
  registry.register('component-lookup:main', ComponentLookup);
}

function commonTeardown() {
  runDestroy(container);
  runDestroy(view);
  registry = container = view = null;
}

function appendViewFor(template, hash={}) {
  let view = EmberView.extend({
    template: compile(template),
    container: container
  }).create(hash);

  runAppend(view);

  return view;
}

function constructComponent(label) {
  return Component.extend({
    init() {
      this.label = label;
      components[label] = this;
      this._super.apply(this, arguments);
    }
  });
}

function extractEnv(component) {
  return component._renderNode.lastResult.env;
}

QUnit.module('ember-htmlbars: RenderEnv', {
  setup() {
    commonSetup();
  },

  teardown() {
    commonTeardown();
  }
});

QUnit.test('non-block component test', function() {
  components = {};

  registry.register('component:non-block', constructComponent('nonblock'));
  registry.register('template:components/non-block', compile('In layout'));

  view = appendViewFor('{{non-block}}');

  ok(view.env instanceof RenderEnv, 'initial render: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.nonblock) instanceof RenderEnv, 'initial render: {{#non-block}} environment should be an instance of RenderEnv');

  run(components.nonblock, 'rerender');

  ok(view.env instanceof RenderEnv, 'rerender: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.nonblock) instanceof RenderEnv, 'rerender: {{#non-block}} environment should be an instance of RenderEnv');
});

QUnit.test('block component test', function() {
  components = {};

  registry.register('component:block-component', constructComponent('block'));
  registry.register('template:components/block-component', compile('In layout {{yield}}'));

  view = appendViewFor('{{#block-component}}content{{/block-component}}');

  ok(view.env instanceof RenderEnv, 'initial render: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'initial render: {{#block-component}} environment should be an instance of RenderEnv');

  run(components.block, 'rerender');

  ok(view.env instanceof RenderEnv, 'rerender: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'rerender: {{#block-component}} environment should be an instance of RenderEnv');
});

QUnit.test('block component with child component test', function() {
  components = {};

  registry.register('component:block-component', constructComponent('block'));
  registry.register('component:child-component', constructComponent('child'));

  registry.register('template:components/block-component', compile('In layout {{yield}}'));
  registry.register('template:components/child-component', compile('Child Component'));

  view = appendViewFor('{{#block-component}}{{child-component}}{{/block-component}}');

  ok(view.env instanceof RenderEnv, 'initial render: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'initial render: {{#block-component}} environment should be an instance of RenderEnv');
  ok(extractEnv(components.child) instanceof RenderEnv, 'initial render: {{child-component}} environment should be an instance of RenderEnv');

  run(components.block, 'rerender');

  ok(view.env instanceof RenderEnv, 'rerender: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'rerender: {{#block-component}} environment should be an instance of RenderEnv');
  ok(extractEnv(components.child) instanceof RenderEnv, 'rerender: {{child-component}} environment should be an instance of RenderEnv');
});
