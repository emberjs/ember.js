import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { compile } from '../../index';

moduleFor(
  'ember-template-compiler: assert-splattribute-expression',
  class extends AbstractTestCase {
    '@test ...attributes is in element space'(assert) {
      assert.expect(0);

      compile('<div ...attributes>Foo</div>');
    }

    '@test {{...attributes}} is not valid path expression'(assert) {
      assert.throws(
        () => compile('<div>{{...attributes}}</div>'),
        /Illegal use of \.\.\.attributes outside of an element opening tag/u
      );
    }

    '@test {{...attributes}} is not valid modifier'(assert) {
      assert.throws(
        () => compile('<div {{...attributes}}>Wat</div>'),
        /\.\.\.attributes cannot be used as a modifier/u
      );
    }

    '@test {{...attributes}} is not valid attribute'(assert) {
      assert.throws(
        () => compile('<div class={{...attributes}}>Wat</div>'),
        /\.\.\.attributes cannot be used as an attribute value/u
      );
    }
  }
);
