import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert-against-named-outlets',
  class extends AbstractTestCase {
    [`@test named outlets are asserted against`]() {
      expectAssertion(() => {
        compile(`{{outlet 'foo'}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `Named outlets were removed in Ember 4.0. See https://deprecations.emberjs.com/v3.x#toc_route-render-template for guidance on alternative APIs for named outlet use cases. ('baz/foo-bar' @ L1:C0) `);

      expectAssertion(() => {
        compile(`{{outlet foo}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `Named outlets were removed in Ember 4.0. See https://deprecations.emberjs.com/v3.x#toc_route-render-template for guidance on alternative APIs for named outlet use cases. ('baz/foo-bar' @ L1:C0) `);

      // No assertion
      compile(`{{outlet}}`, {
        moduleName: 'baz/foo-bar',
      });
    }
  }
);
