import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'Top Level DOM Structure',
  class extends ApplicationTestCase {
    ['@test topmost template without wrapper']() {
      this.addTemplate('application', 'hello world');

      return this.visit('/').then(() => {
        this.assertInnerHTML('hello world');
      });
    }
  }
);
