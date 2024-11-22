import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-test-app/tests/helpers';

module('Acceptance | example gjs route', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /example-gjs-route', async function (assert) {
    await visit('/example-gjs-route');
    assert.strictEqual(currentURL(), '/example-gjs-route');
    assert.dom('[data-test="model-field"]').containsText('I am the model');
    assert.dom('[data-test="controller-field"]').containsText('This is on the controller');
    assert.dom('[data-test="component-getter"]').containsText('I am on the component');
  });
});
