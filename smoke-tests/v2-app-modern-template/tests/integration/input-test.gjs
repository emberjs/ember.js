import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, fillIn } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';
import { Input } from '@ember/component';

module('Integration | built-in input', function (hooks) {
  setupRenderingTest(hooks);

  test('<Input> two-way binds a tracked value', async function (assert) {
    class State {
      @tracked value = 'initial';
    }
    const state = new State();

    await render(
      <template><Input data-test-field @value={{state.value}} /></template>
    );

    assert.dom('[data-test-field]').hasValue('initial');

    await fillIn('[data-test-field]', 'updated');

    assert.strictEqual(state.value, 'updated', 'writes back to tracked state');
  });
});
