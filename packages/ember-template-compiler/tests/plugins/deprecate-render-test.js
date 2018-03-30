import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: deprecate-render',
  class extends AbstractTestCase {
    ['@test Using `{{render` without a model provides a deprecation']() {
      let expectedMessage =
        `Please refactor \`{{render "foo-bar"}}\` to a component and` +
        ` invoke via \`{{foo-bar}}\`. ('baz/foo-bar' @ L1:C0) `;

      expectDeprecation(() => {
        compile('{{render "foo-bar"}}', {
          moduleName: 'baz/foo-bar'
        });
      }, expectedMessage);
    }
  }
);
