import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('ember-template-compiler: deprecate-model-render', class extends AbstractTestCase {
  ['@test Using `{{render` with model provides a deprecation'](assert) {

    let expectedMessage =
      `Please refactor \`{{render "foo-bar" coolModel}}\` to a component and` +
      ` invoke via \`{{foo-bar model=coolModel}}\`. ('baz/foo-bar' @ L1:C0) `;

    assert.expectDeprecation(() => {
      compile('{{render "foo-bar" coolModel}}', {
        moduleName: 'baz/foo-bar'
      });
    }, expectedMessage);
  }
});
