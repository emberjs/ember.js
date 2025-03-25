import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { compile } from '../../index';

const message = `Illegal use of ...attributes`;

moduleFor(
  'ember-template-compiler: assert-splattribute-expression',
  class extends AbstractTestCase {
    '@test ...attributes is in element space'(assert) {
      assert.expect(0);

      compile('<div ...attributes>Foo</div>');
    }

    '@test {{...attributes}} is not valid path expression'(assert) {
      assert.throws(() => compile('<div>{{...attributes}}</div>'), message);
    }

    '@test {{...attributes}} is not valid modifier'(assert) {
      assert.throws(() => compile('<div {{...attributes}}>Wat</div>', message));
    }

    '@test {{...attributes}} is not valid attribute'(assert) {
      assert.throws(() => compile('<div class={{...attributes}}>Wat</div>', message));
    }
  }
);
