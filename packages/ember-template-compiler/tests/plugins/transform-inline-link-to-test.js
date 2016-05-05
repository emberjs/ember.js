import { ENV } from 'ember-environment';
import { compile } from 'ember-template-compiler';
import AssertNoViewAndControllerPaths from 'ember-template-compiler/plugins/assert-no-view-and-controller-paths';
import plugins, { registerPlugin } from 'ember-template-compiler/plugins';

function registerAstPlugin(plugin) {
  registerPlugin('ast', plugin);
}

function removeAstPlugin(plugin) {
  let index = plugins['ast'].indexOf(plugin);
  plugins['ast'].splice(index, 1);
}

let legacyViewSupportOriginalValue;

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-template-compiler: assert-no-view-and-controller-paths without legacy view support', {
  setup() {
    legacyViewSupportOriginalValue = ENV._ENABLE_LEGACY_VIEW_SUPPORT;
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
    registerAstPlugin(AssertNoViewAndControllerPaths);
  },

  teardown() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = legacyViewSupportOriginalValue;
    removeAstPlugin(AssertNoViewAndControllerPaths);
  }
});

test('Can transform an inline {{link-to}} without error', function() {
  expect(0);

  compile(`{{link-to 'foo' 'index'}}`, {
    moduleName: 'foo/bar/baz'
  });
});
