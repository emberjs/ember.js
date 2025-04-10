import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from '<%= modulePrefix %>/tests/helpers';

module('<%= friendlyTestName %>', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /<%= dasherizedModuleName %>', async function (assert) {
    await visit('/<%= dasherizedModuleName %>');

    assert.strictEqual(currentURL(), '/<%= dasherizedModuleName %>');
  });
});
