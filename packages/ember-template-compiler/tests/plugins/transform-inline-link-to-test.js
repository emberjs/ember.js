import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: inline-link-to',
  class extends AbstractTestCase {
    ['@test Can transform an inline {{link-to}} without error'](assert) {
      assert.expect(0);

      compile(`{{link-to 'foo' 'index'}}`, {
        moduleName: 'foo/bar/baz'
      });
    }
  }
);
