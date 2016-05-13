import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-htmlbars/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, component;

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

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('component - invocation', {
  setup() {
    commonSetup();
  },

  teardown() {
    commonTeardown();
  }
});

test('moduleName is available on _renderNode when a layout is present', function() {
  expect(1);

  var layoutModuleName = 'my-app-name/templates/components/sample-component';
  var sampleComponentLayout = compile('Sample Component - {{yield}}', {
    moduleName: layoutModuleName
  });
  owner.register('template:components/sample-component', sampleComponentLayout);
  owner.register('component:sample-component', Component.extend({
    didInsertElement: function() {
      equal(this._renderNode.lastResult.template.meta.moduleName, layoutModuleName);
    }
  }));

  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component}}')
  }).create();

  runAppend(component);
});

test('moduleName is available on _renderNode when no layout is present', function() {
  expect(1);

  var templateModuleName = 'my-app-name/templates/application';
  owner.register('component:sample-component', Component.extend({
    didInsertElement: function() {
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
