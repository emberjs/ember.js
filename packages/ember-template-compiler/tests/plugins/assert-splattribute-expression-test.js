import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { compile } from '../../index';

moduleFor(
  'ember-template-compiler: assert-splattribute-expression',
  class extends AbstractTestCase {
    expectedMessage(locInfo) {
      return `\`...attributes\` can only be used in the element position e.g. \`<div ...attributes />\`. It cannot be used as a path. (${locInfo}) `;
    }

    '@test ...attributes is in element space'(assert) {
      assert.expect(0);

      compile('<div ...attributes>Foo</div>');
    }

    '@test {{...attributes}} is not valid'() {
      expectAssertion(() => {
        compile('<div>{{...attributes}}</div>', {
          moduleName: 'foo-bar',
        });
      }, this.expectedMessage(`'foo-bar' @ L1:C7`));
    }

    '@test {{...attributes}} is not valid path expression'() {
      expectAssertion(() => {
        compile('<div>{{...attributes}}</div>', {
          moduleName: 'foo-bar',
        });
      }, this.expectedMessage(`'foo-bar' @ L1:C7`));
    }
    '@test {{...attributes}} is not valid modifier'() {
      expectAssertion(() => {
        compile('<div {{...attributes}}>Wat</div>', {
          moduleName: 'foo-bar',
        });
      }, this.expectedMessage(`'foo-bar' @ L1:C7`));
    }

    '@test {{...attributes}} is not valid attribute'() {
      expectAssertion(() => {
        compile('<div class={{...attributes}}>Wat</div>', {
          moduleName: 'foo-bar',
        });
      }, this.expectedMessage(`'foo-bar' @ L1:C13`));
    }
  }
);
