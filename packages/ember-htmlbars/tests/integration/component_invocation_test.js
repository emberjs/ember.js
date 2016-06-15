import { compile } from 'ember-htmlbars-template-compiler';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-htmlbars/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

let owner, component;

function commonSetup() {
  owner = buildOwner();
  owner.registerOptionsForType('component', { singleton: false });
  owner.registerOptionsForType('template', { instantiate: false });
  owner.register('component-lookup:main', ComponentLookup);
}

function commonTeardown() {
  runDestroy(owner);
  runDestroy(component);
  owner = component = null;
}

QUnit.module('component - invocation', {
  setup() {
    commonSetup();
  },

  teardown() {
    commonTeardown();
  }
});

QUnit.test('moduleName is available on _renderNode when a layout is present', function() {
  expect(1);

  let layoutModuleName = 'my-app-name/templates/components/sample-component';
  let sampleComponentLayout = compile('Sample Component - {{yield}}', {
    moduleName: layoutModuleName
  });
  owner.register('template:components/sample-component', sampleComponentLayout);
  owner.register('component:sample-component', Component.extend({
    didInsertElement() {
      equal(this._renderNode.lastResult.template.meta.moduleName, layoutModuleName);
    }
  }));

  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component}}')
  }).create();

  runAppend(component);
});

QUnit.test('moduleName is available on _renderNode when no layout is present', function() {
  expect(1);

  let templateModuleName = 'my-app-name/templates/application';
  owner.register('component:sample-component', Component.extend({
    didInsertElement() {
      equal(this._renderNode.lastResult.template.meta.moduleName, templateModuleName);
    }
  }));

  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{#sample-component}}Derp{{/sample-component}}', {
      moduleName: templateModuleName
    })
  }).create();

  runAppend(component);
});
