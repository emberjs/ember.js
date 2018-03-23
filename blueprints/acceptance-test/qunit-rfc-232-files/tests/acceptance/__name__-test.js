import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import setupApplicationTest from '<%= testFolderRoot %>/tests/helpers/index';

module('<%= friendlyTestName %>', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /<%= dasherizedModuleName %>', async function(assert) {
    await visit('/<%= dasherizedModuleName %>');

    assert.equal(currentURL(), '/<%= dasherizedModuleName %>');
  });
});
