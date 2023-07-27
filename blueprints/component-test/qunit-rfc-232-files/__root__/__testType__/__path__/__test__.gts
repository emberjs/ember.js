<% if (testType === 'integration') { %>import { module, test } from 'qunit';
import { setupRenderingTest } from '<%= modulePrefix %>/tests/helpers';
import { render } from '@ember/test-helpers';
import <%= componentName =%> from '<%= modulePrefix %>/<%= componentPathName =%>';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(<template><%= selfCloseComponent(componentName) %></template>);

    assert.dom().hasText('');

    // Template block usage:
    await render(<template>
      <%= openComponent(componentName) %>
        template block text
      <%= closeComponent(componentName) %>
    </template>);

    assert.dom().hasText('template block text');
  });
});<% } else if (testType === 'unit') { %>import { module, test } from 'qunit';
import { setupTest } from '<%= modulePrefix %>/tests/helpers';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let component = this.owner.factoryFor('component:<%= componentPathName %>').create();
    assert.ok(component);
  });
}); <% } %>
