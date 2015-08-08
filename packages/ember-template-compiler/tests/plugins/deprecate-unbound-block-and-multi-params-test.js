import { compile } from 'ember-template-compiler';

QUnit.module('ember-template-compiler: deprecate-unbound-block-and-multi-params');

QUnit.test('Using `{{unbound}}` with a block issues a deprecation', function() {
  expect(1);

  expectDeprecation(function() {
    compile('{{#unbound "foo"}}{{/unbound}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using the {{unbound}} helper with a block ('foo/bar/baz' @ L1:C0) is deprecated and will be removed in 2.0.0.`);
});

QUnit.test('Using `{{unbound}}` with multiple params issues a deprecation', function() {
  expect(1);

  expectDeprecation(function() {
    compile('{{unbound foo bar}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using the {{unbound}} helper with multiple params ('foo/bar/baz' @ L1:C0) is deprecated and will be removed in 2.0.0. Please refactor to nested helper usage.`);
});

QUnit.test('Using `{{unbound}}` with a single param is not deprecated', function() {
  expect(1);

  compile('{{unbound foo}}', {
    moduleName: 'foo/bar/baz'
  });

  ok(true, 'no deprecations or assertions');
});
