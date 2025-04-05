<% if (testType === 'integration') { %>import { module, test } from 'qunit';
import { setupRenderingTest } from '<%= modulePrefix %>/tests/helpers';
import { render } from '@ember/test-helpers';
import <%= componentName %> from '<%= pkgName %>/components/<%= componentPathName %>';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Updating values is achieved using autotracking, just like in app code. For example:
    // class State { @tracked myProperty = 0; }; const state = new State();
    // and update using state.myProperty = 1; await rerender();
    // Handle any actions with function myAction(val) { ... };

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
