import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor('Top Level DOM Structure', class extends ApplicationTestCase {
  ['@test Topmost template always get an element'](assert) {
    this.addTemplate('application', 'hello world');

    return this.visit('/').then(() => {
      assert.equal(this.$('> .ember-view').text(), 'hello world');
    });
  }
});
