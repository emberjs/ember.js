import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import { helper } from 'ember-htmlbars/helper';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, component;

QUnit.module('component - invocation', {
  setup() {
    owner = buildOwner();
    owner.registerOptionsForType('component', { singleton: false });
    owner.registerOptionsForType('view', { singleton: false });
    owner.registerOptionsForType('template', { instantiate: false });
    owner.registerOptionsForType('helper', { instantiate: false });
    owner.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(owner);
    runDestroy(component);
    owner = component = null;
  }
});

QUnit.test('non-dashed helpers are found', function() {
  expect(1);

  owner.register('helper:fullname', helper(function( [first, last]) {
    return `${first} ${last}`;
  }));

  component = Component.extend({
    [OWNER]: owner,
    layout: compile('{{fullname "Robert" "Jackson"}}')
  }).create();

  runAppend(component);

  equal(component.$().text(), 'Robert Jackson');
});
