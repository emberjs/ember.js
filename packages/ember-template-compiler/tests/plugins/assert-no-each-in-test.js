import { ENV } from 'ember-environment';
import { compile } from 'ember-template-compiler';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';


const legacyViewSupportOriginalValue = ENV._ENABLE_LEGACY_VIEW_SUPPORT;

testModule('ember-template-compiler: assert-no-each-in-test without legacy view support', {
  setup() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = false;
  },

  teardown() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = legacyViewSupportOriginalValue;
  }
});

test('{{#each foo in bar}} is not allowed', function() {
  expect(1);

  expectAssertion(function() {
    compile('{{#each person in people}}{{person.name}}{{/each}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using {{#each person in people}} ('foo/bar/baz' @ L1:C0) is no longer supported in Ember 2.0+, please use {{#each people as |person|}}`);
});


testModule('ember-template-compiler: assert-no-each-in-test with legacy view support', {
  setup() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = true;
  },

  teardown() {
    ENV._ENABLE_LEGACY_VIEW_SUPPORT = legacyViewSupportOriginalValue;
  }
});

test('{{#each foo in bar}} is allowed', function() {
  expect(1);

  compile('{{#each person in people}}{{person.name}}{{/each}}', {
    moduleName: 'foo/bar/baz'
  });

  ok(true);
});
