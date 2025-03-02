import { module, test } from 'qunit';
import { setupRenderingTest } from 'my-app/tests/helpers';
import { render } from '@ember/test-helpers';
import XFoo from 'my-app/components/x-foo';

module('Integration | Component | x-foo', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Updating values is achieved using autotracking, just like in app code. For example:
    // class State { @tracked myProperty = 0; }; const state = new State();
    // and update using state.myProperty = 1; await rerender();
    // Handle any actions with function myAction(val) { ... };

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
