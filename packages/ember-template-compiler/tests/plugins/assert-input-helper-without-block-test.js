import { compile } from '../../index';

QUnit.module('ember-template-compiler: assert-input-helper-without-block');

QUnit.test('Using {{#input}}{{/input}} is not valid', function() {
  expect(1);

  let expectedMessage =
    `The {{input}} helper cannot be used in block form. ('baz/foo-bar' @ L1:C0) `;

  expectAssertion(() => {
    compile('{{#input value="123"}}Completely invalid{{/input}}', {
      moduleName: 'baz/foo-bar'
    });
  }, expectedMessage);
});
