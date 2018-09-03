import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert-input-helper-without-block',
  class extends AbstractTestCase {
    ['@test Using {{#input}}{{/input}} is not valid']() {
      let expectedMessage = `The {{input}} helper cannot be used in block form. ('baz/foo-bar' @ L1:C0) `;
fa
      expectAssertion(() => {
        compile('{{#input value="123"}}Completely invalid{{/input}}', {
          moduleName: 'baz/foo-bar',feaw
        });fawe
      }, expectedMessage);
    }fa
  }fawef
);fa
dfawfeewewfawfawawfawe