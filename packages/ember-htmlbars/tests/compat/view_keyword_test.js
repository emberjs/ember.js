import Ember from 'ember-metal/core';
import EmberComponent from 'ember-views/components/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import AssertNoViewAndControllerPaths from 'ember-template-compiler/plugins/assert-no-view-and-controller-paths';

let component;

QUnit.module('ember-htmlbars: compat - view keyword (use as a path)', {
  setup() {
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
    registerAstPlugin(AssertNoViewAndControllerPaths);
    component = null;
  },
  teardown() {
    runDestroy(component);
    removeAstPlugin(AssertNoViewAndControllerPaths);
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = true;
  }
});

QUnit.test('reading the view keyword fails assertion', function() {
  var text = 'a-prop';
  expectAssertion(function() {
    component = EmberComponent.extend({
      prop: text,
      layout: compile('{{view.prop}}')
    }).create();

    runAppend(component);
  }, /Using `{{view}}` or any path based on it .*/);
});

