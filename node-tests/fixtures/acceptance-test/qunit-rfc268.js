import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | foo', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /foo', async function(assert) {
    await visit('/foo');

    assert.equal(currentURL(), '/foo');
  });
});
