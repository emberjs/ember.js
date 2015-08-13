import Ember from 'ember-metal/core';
import EmberComponent from 'ember-views/components/component';
import EmberView from 'ember-views/views/view';
import EmberSelectView from 'ember-views/views/select';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';
import Registry from 'container/registry';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import AssertNoViewHelper from 'ember-template-compiler/plugins/assert-no-view-helper';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

let component, registry, container, originalViewKeyword;

QUnit.module('ember-htmlbars: compat - view helper', {
  setup() {
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
    registerAstPlugin(AssertNoViewHelper);

    originalViewKeyword = registerKeyword('view',  viewKeyword);

    registry = new Registry();
    container = registry.container();
  },
  teardown() {
    runDestroy(component);
    runDestroy(container);
    removeAstPlugin(AssertNoViewHelper);
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = true;
    registry = container = component = null;

    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('using the view helper fails assertion', function(assert) {
  const ViewClass = EmberView.extend({
    template: compile('fooView')
  });
  registry.register('view:foo', ViewClass);

  expectAssertion(function() {
    component = EmberComponent.extend({
      layout: compile('{{view \'foo\'}}'),
      container
    }).create();

    runAppend(component);
  }, /Using the `{{view "string"}}` helper/);
});

QUnit.module('ember-htmlbars: compat - view helper [LEGACY]', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);

    registry = new Registry();
    container = registry.container();
  },
  teardown() {
    runDestroy(component);
    runDestroy(container);
    registry = container = component = null;

    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('using the view helper with a string (inline form) fails assertion [LEGACY]', function(assert) {
  const ViewClass = EmberView.extend({
    template: compile('fooView')
  });
  registry.register('view:foo', ViewClass);

  ignoreAssertion(function() {
    component = EmberComponent.extend({
      layout: compile('{{view \'foo\'}}'),
      container
    }).create();

    runAppend(component);
  });

  assert.equal(component.$().text(), 'fooView', 'view helper is still rendered');
});

QUnit.test('using the view helper with a string (block form) fails assertion [LEGACY]', function(assert) {
  const ViewClass = EmberView.extend({
    template: compile('Foo says: {{yield}}')
  });
  registry.register('view:foo', ViewClass);

  ignoreAssertion(function() {
    component = EmberComponent.extend({
      layout: compile('{{#view \'foo\'}}I am foo{{/view}}'),
      container
    }).create();

    runAppend(component);
  });

  assert.equal(component.$().text(), 'Foo says: I am foo', 'view helper is still rendered');
});

QUnit.test('using the view helper with string "select" fails assertion [LEGACY]', function(assert) {
  registry.register('view:select', EmberSelectView);

  ignoreAssertion(function() {
    component = EmberComponent.extend({
      layout: compile('{{view \'select\'}}'),
      container
    }).create();

    runAppend(component);
  });

  assert.ok(!!component.$('select').length, 'still renders select');
});
