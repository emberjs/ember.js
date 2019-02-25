<% if (testType === 'integration') { %>import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('<%= friendlyTestName %>', function(hooks) {
  setupRenderingTest(hooks);

  // Replace this with your real tests.
  test('it renders', async function(assert) {
    this.set('inputValue', '1234');

    await render(hbs`{{<%= dasherizedModuleName %> inputValue}}`);

    assert.equal(this.element.textContent.trim(), '1234');
  });
});<% } else if (testType === 'unit') { %>import { <%= camelizedModuleName %> } from '<%= dasherizedModulePrefix %>/helpers/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('<%= friendlyTestName %>', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it works', function(assert) {
    let result = <%= camelizedModuleName %>([42]);
    assert.ok(result);
  });
});<% } %>
