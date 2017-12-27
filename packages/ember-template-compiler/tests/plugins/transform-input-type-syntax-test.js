import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('ember-template-compiler: input type syntax', class extends AbstractTestCase {
  ['@test Can compile an {{input}} helper that has a sub-expression value as its type'](assert) {
    assert.expect(0);

    compile(`{{input type=(if true 'password' 'text')}}`);
  }

  ['@test Can compile an {{input}} helper with a string literal type'](assert) {
    assert.expect(0);

    compile(`{{input type='text'}}`);
  }

  ['@test Can compile an {{input}} helper with a type stored in a var'](assert) {
    assert.expect(0);

    compile(`{{input type=_type}}`);
  }
});
