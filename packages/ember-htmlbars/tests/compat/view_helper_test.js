import { ENV } from 'ember-environment';
import EmberComponent from 'ember-htmlbars/component';
import EmberView from 'ember-views/views/view';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';
import { OWNER } from 'container/owner';
import buildOwner from 'container/tests/test-helpers/build-owner';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import AssertNoViewHelper from 'ember-template-compiler/plugins/assert-no-view-helper';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

let component, owner, originalViewKeyword;

let originalLegacyViewSupport = ENV._ENABLE_LEGACY_VIEW_SUPPORT;

testModule('ember-htmlbars: compat - view helper', {
  setup() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
    registerAstPlugin(AssertNoViewHelper);

    originalViewKeyword = registerKeyword('view',  viewKeyword);

    owner = buildOwner();
  },
  teardown() {
    runDestroy(component);
    runDestroy(owner);
    removeAstPlugin(AssertNoViewHelper);
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = originalLegacyViewSupport;
    owner = component = null;

    resetKeyword('view', originalViewKeyword);
  }
});

test('using the view helper fails assertion', function(assert) {
  let ViewClass = EmberView.extend({
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

testModule('ember-htmlbars: compat - view helper [LEGACY]', {
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

test('using the view helper with a string (inline form) fails assertion [LEGACY]', function(assert) {
  let ViewClass = EmberView.extend({
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

test('using the view helper with a string (block form) fails assertion [LEGACY]', function(assert) {
  let ViewClass = EmberView.extend({
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
