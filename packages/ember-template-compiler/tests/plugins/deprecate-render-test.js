import { compile } from '../../index';

QUnit.module('ember-template-compiler: deprecate-render');

QUnit.test('Using `{{render` without a model provides a deprecation', function() {
  expect(1);

  let expectedMessage =
    `Please refactor \`{{render "foo-bar"}}\` to a component and` +
    ` invoke via \`{{foo-bar}}\`. ('baz/foo-bar' @ L1:C0) `;

  expectDeprecation(() => {
    compile('{{render "foo-bar"}}', {
      moduleName: 'baz/foo-bar'
    });
  }, expectedMessage);
});
