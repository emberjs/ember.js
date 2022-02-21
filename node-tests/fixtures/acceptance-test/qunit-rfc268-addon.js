import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'my-addon/tests/helpers';

module('Acceptance | foo', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /foo', async function (assert) {
    await visit('/foo');

    assert.strictEqual(currentURL(), '/foo');
  });
});
