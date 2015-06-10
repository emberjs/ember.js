import { compile } from "ember-template-compiler";

QUnit.module('ember-template-compiler: transform-each-in-to-block-params');

QUnit.test('cannot use block params and keyword syntax together', function() {
  expect(1);

  throws(function() {
    compile('{{#each thing in controller as |other-thing|}}{{thing}}-{{other-thing}}{{/each}}', true);
  }, /You cannot use keyword \(`{{#each foo in bar}}`\) and block params \(`{{#each bar as \|foo\|}}`\) at the same time\ ./);
});

QUnit.test('using {{#each in}} syntax is deprecated for blocks', function() {
  expect(1);

  expectDeprecation(function() {
    compile('\n\n   {{#each foo in model}}{{/each}}', { moduleName: 'foo/bar/baz' });
  }, `Using the '{{#each item in model}}' form of the {{#each}} helper ('foo/bar/baz' @ L3:C3) is deprecated. Please use the block param form instead ('{{#each model as |item|}}').`);
});

QUnit.test('using {{#each in}} syntax is deprecated for non-block statemens', function() {
  expect(1);

  expectDeprecation(function() {
    compile('\n\n   {{each foo in model}}', { moduleName: 'foo/bar/baz' });
  }, `Using the '{{#each item in model}}' form of the {{#each}} helper ('foo/bar/baz' @ L3:C3) is deprecated. Please use the block param form instead ('{{#each model as |item|}}').`);
});
