import Ember from 'ember-metal/core'; // ENV
import EmberComponent from 'ember-views/components/component';
import EmberView from 'ember-views/views/view';
import EmberSelectView from 'ember-views/views/select';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';
import { OWNER } from 'container/owner';
import buildOwner from 'container/tests/test-helpers/build-owner';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import AssertNoViewHelper from 'ember-template-compiler/plugins/assert-no-view-helper';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

let component, owner, originalViewKeyword;

QUnit.module('ember-htmlbars: compat - view helper', {
  setup() {
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
    registerAstPlugin(AssertNoViewHelper);

    originalViewKeyword = registerKeyword('view',  viewKeyword);

    owner = buildOwner();
  },
  teardown() {
    runDestroy(component);
    runDestroy(owner);
    removeAstPlugin(AssertNoViewHelper);
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = true;
    owner = component = null;

    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('using the view helper fails assertion', function(assert) {
  const ViewClass = EmberView.extend({
    template: compile('fooView')
  });
  owner.register('view:foo', ViewClass);

  expectAssertion(function() {
    component = EmberComponent.extend({
      [OWNER]: owner,
      layout: compile('{{view \'foo\'}}')
    }).create();

    runAppend(component);
  }, /Using the `{{view "string"}}` helper/);
});

QUnit.module('ember-htmlbars: compat - view helper [LEGACY]', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);

    owner = buildOwner();
  },
  teardown() {
    runDestroy(component);
    runDestroy(owner);
    owner = component = null;

    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('using the view helper with a string (inline form) fails assertion [LEGACY]', function(assert) {
  const ViewClass = EmberView.extend({
    template: compile('fooView')
  });
  owner.register('view:foo', ViewClass);

  ignoreAssertion(function() {
    component = EmberComponent.extend({
      [OWNER]: owner,
      layout: compile('{{view \'foo\'}}')
    }).create();

    runAppend(component);
  });

  assert.equal(component.$().text(), 'fooView', 'view helper is still rendered');
});

QUnit.test('using the view helper with a string (block form) fails assertion [LEGACY]', function(assert) {
  const ViewClass = EmberView.extend({
    template: compile('Foo says: {{yield}}')
  });
  owner.register('view:foo', ViewClass);

  ignoreAssertion(function() {
    component = EmberComponent.extend({
      [OWNER]: owner,
      layout: compile('{{#view \'foo\'}}I am foo{{/view}}')
    }).create();

    runAppend(component);
  });

  assert.equal(component.$().text(), 'Foo says: I am foo', 'view helper is still rendered');
});

QUnit.test('using the view helper with string "select" fails assertion [LEGACY]', function(assert) {
  owner.register('view:select', EmberSelectView);

  ignoreAssertion(function() {
    component = EmberComponent.extend({
      [OWNER]: owner,
      layout: compile('{{view \'select\'}}')
    }).create();

    runAppend(component);
  });

  assert.ok(!!component.$('select').length, 'still renders select');
});
