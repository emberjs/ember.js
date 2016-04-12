import Ember from 'ember-metal/core';
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

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
  // jscs:disable

QUnit.module('ember-template-compiler: assert-no-view-and-controller-paths without legacy view support', {
  setup() {
    legacyViewSupportOriginalValue = Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT;
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
    registerAstPlugin(AssertNoViewAndControllerPaths);
  },

  teardown() {
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = legacyViewSupportOriginalValue;
    removeAstPlugin(AssertNoViewAndControllerPaths);
  }
});

QUnit.test('Can transform an inline {{link-to}} without error', function() {
  expect(0);

  compile(`{{link-to 'foo' 'index'}}`, {
    moduleName: 'foo/bar/baz'
  });
});

}
