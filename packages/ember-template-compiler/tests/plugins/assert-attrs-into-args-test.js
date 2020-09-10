import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { compile } from '../../index';

moduleFor(
  'ember-template-compiler: assert-attrs-into-args-expression',
  class extends AbstractTestCase {
    expectedMessage(locInfo) {
      return `String "foo-bar" could not be used as a path. (${locInfo}) `;
    }

    '@test <MyComponent {{foo ("foo-baz")}} /> is not valid'() {
      expectAssertion(() => {
        compile('<MyComponent {{foo ("foo-baz")}} />', {
          moduleName: 'foo-bar',
        });
      }, this.expectedMessage(`'foo-bar' @ L1:C21`));
    }
  }
);
