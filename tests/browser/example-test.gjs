import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';


module('Example', function (hooks) {
  setupRenderingTest(hooks);

  test('example test', async function (assert) {
    await render(
      <template>
        hello there
      </template>
    );

    assert.dom().containsText('hello there');
  });
});
