import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | x-foo', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<XFoo />`);

    assert.dom(this.element).hasText('');

    // Template block usage:
    await render(hbs`
      <XFoo>
        template block text
      </XFoo>
    `);

    assert.dom(this.element).hasText('template block text');
  });
});
