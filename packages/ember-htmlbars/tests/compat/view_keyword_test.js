import { ENV } from 'ember-environment';
import EmberComponent from 'ember-htmlbars/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import AssertNoViewAndControllerPaths from 'ember-template-compiler/plugins/assert-no-view-and-controller-paths';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

let component;

let originalLegacyViewSupport = ENV._ENABLE_LEGACY_VIEW_SUPPORT;

testModule('ember-htmlbars: compat - view keyword (use as a path)', {
  setup() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
    registerAstPlugin(AssertNoViewAndControllerPaths);
    component = null;
  },
  teardown() {
    runDestroy(component);
    removeAstPlugin(AssertNoViewAndControllerPaths);
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = originalLegacyViewSupport;
  }
});

test('reading the view keyword fails assertion', function() {
  var text = 'a-prop';
  expectAssertion(function() {
    component = EmberComponent.extend({
      prop: text,
      layout: compile('{{view.prop}}')
    }).create();

    runAppend(component);
  }, /Using `{{view}}` or any path based on it .*/);
});
