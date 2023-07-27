import { module, test } from 'qunit';
import { setupRenderingTest } from 'my-app/tests/helpers';
import { render } from '@ember/test-helpers';
import XFoo from 'my-app/components/x-foo';

module('Integration | Component | x-foo', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(<template><XFoo /></template>);

    assert.dom().hasText('');

    // Template block usage:
    await render(<template>
      <XFoo>
        template block text
      </XFoo>
    </template>);

    assert.dom().hasText('template block text');
  });
});
