import { compile } from '../../index';

QUnit.module('ember-template-compiler: assert-reserved-named-arguments');

QUnit.test('Paths beginning with @ are not valid', function() {
  expect(3);

  expectAssertion(() => {
    compile('{{@foo}}', {
      moduleName: 'baz/foo-bar'
    });
  }, `'@foo' is not a valid path. ('baz/foo-bar' @ L1:C2) `);

  expectAssertion(() => {
    compile('{{#if @foo}}Yup{{/if}}', {
      moduleName: 'baz/foo-bar'
    });
  }, `'@foo' is not a valid path. ('baz/foo-bar' @ L1:C6) `);

  expectAssertion(() => {
    compile('{{input type=(if @foo "bar" "baz")}}', {
      moduleName: 'baz/foo-bar'
    });
  }, `'@foo' is not a valid path. ('baz/foo-bar' @ L1:C17) `);
});
