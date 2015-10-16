import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import RenderEnv from 'ember-htmlbars/system/render-env';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import run from 'ember-metal/run_loop';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view, components;

function commonSetup() {
  owner = buildOwner();
  owner.registerOptionsForType('component', { singleton: false });
  owner.registerOptionsForType('view', { singleton: false });
  owner.registerOptionsForType('template', { instantiate: false });
  owner.registerOptionsForType('helper', { instantiate: false });
  owner.register('component-lookup:main', ComponentLookup);
}

function commonTeardown() {
  runDestroy(owner);
  runDestroy(view);
  owner = view = null;
}

function appendViewFor(template, hash={}) {
  let view = EmberView.extend({
    [OWNER]: owner,
    template: compile(template)
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

  owner.register('component:non-block', constructComponent('nonblock'));
  owner.register('template:components/non-block', compile('In layout'));

  view = appendViewFor('{{non-block}}');

  ok(view.env instanceof RenderEnv, 'initial render: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.nonblock) instanceof RenderEnv, 'initial render: {{#non-block}} environment should be an instance of RenderEnv');

  run(components.nonblock, 'rerender');

  ok(view.env instanceof RenderEnv, 'rerender: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.nonblock) instanceof RenderEnv, 'rerender: {{#non-block}} environment should be an instance of RenderEnv');
});

QUnit.test('block component test', function() {
  components = {};

  owner.register('component:block-component', constructComponent('block'));
  owner.register('template:components/block-component', compile('In layout {{yield}}'));

  view = appendViewFor('{{#block-component}}content{{/block-component}}');

  ok(view.env instanceof RenderEnv, 'initial render: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'initial render: {{#block-component}} environment should be an instance of RenderEnv');

  run(components.block, 'rerender');

  ok(view.env instanceof RenderEnv, 'rerender: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'rerender: {{#block-component}} environment should be an instance of RenderEnv');
});

QUnit.test('block component with child component test', function() {
  components = {};

  owner.register('component:block-component', constructComponent('block'));
  owner.register('component:child-component', constructComponent('child'));

  owner.register('template:components/block-component', compile('In layout {{yield}}'));
  owner.register('template:components/child-component', compile('Child Component'));

  view = appendViewFor('{{#block-component}}{{child-component}}{{/block-component}}');

  ok(view.env instanceof RenderEnv, 'initial render: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'initial render: {{#block-component}} environment should be an instance of RenderEnv');
  ok(extractEnv(components.child) instanceof RenderEnv, 'initial render: {{child-component}} environment should be an instance of RenderEnv');

  run(components.block, 'rerender');

  ok(view.env instanceof RenderEnv, 'rerender: View environment should be an instance of RenderEnv');
  ok(extractEnv(components.block) instanceof RenderEnv, 'rerender: {{#block-component}} environment should be an instance of RenderEnv');
  ok(extractEnv(components.child) instanceof RenderEnv, 'rerender: {{child-component}} environment should be an instance of RenderEnv');
});
