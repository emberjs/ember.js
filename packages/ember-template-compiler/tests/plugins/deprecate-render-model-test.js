import { compile } from '../../index';

QUnit.module('ember-template-compiler: deprecate-model-render');

QUnit.test('Using `{{render` with model provides a deprecation', function() {
  expect(1);

  let expectedMessage =
    `Please refactor \`{{render "foo-bar" coolModel}}\` to a component and` +
    ` invoke via \`{{foo-bar model=coolModel}}\`. ('baz/foo-bar' @ L1:C0) `;

  expectDeprecation(() => {
    compile('{{render "foo-bar" coolModel}}', {
      moduleName: 'baz/foo-bar'
    });
  }, expectedMessage);
});
