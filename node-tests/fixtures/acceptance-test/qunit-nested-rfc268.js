import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | foo/bar', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /foo/bar', async function(assert) {
    await visit('/foo/bar');

    assert.equal(currentURL(), '/foo/bar');
  });
});
