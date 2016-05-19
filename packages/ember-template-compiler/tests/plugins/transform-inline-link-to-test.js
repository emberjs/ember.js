import { ENV } from 'ember-environment';
import { compile } from 'ember-template-compiler';

let legacyViewSupportOriginalValue;

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-template-compiler: assert-no-view-and-controller-paths without legacy view support', {
  setup() {
    legacyViewSupportOriginalValue = ENV._ENABLE_LEGACY_VIEW_SUPPORT;
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
  },

  teardown() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = legacyViewSupportOriginalValue;
  }
});

test('Can transform an inline {{link-to}} without error', function() {
  expect(0);

  compile(`{{link-to 'foo' 'index'}}`, {
    moduleName: 'foo/bar/baz'
  });
});
