import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';

moduleFor(
  'Top Level DOM Structure',
  class extends ApplicationTestCase {
    ['@test topmost template without wrapper']() {
      this.add('template:application', precompileTemplate('hello world'));

      return this.visit('/').then(() => {
        this.assertInnerHTML('hello world');
      });
    }
  }
);
