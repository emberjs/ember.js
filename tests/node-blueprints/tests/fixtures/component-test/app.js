import { module, test } from 'qunit';
import { setupRenderingTest } from 'my-app/tests/helpers';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | <%= component =%>', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<<%= componentInvocation =%> />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <<%= componentInvocation =%>>
        template block text
      </<%= componentInvocation =%>>
    `);

    assert.dom().hasText('template block text');
  });
});
