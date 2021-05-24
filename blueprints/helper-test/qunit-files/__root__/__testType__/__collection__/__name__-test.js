<% if (testType == 'integration') { %>import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('<%= dasherizedModuleName %>', 'helper:<%= dasherizedModuleName %>', {
  integration: true
});

// TODO: Replace this with your real tests.
test('it renders', function(assert) {
  this.set('inputValue', '1234');

  this.render(hbs`{{<%= dasherizedModuleName %> this.inputValue}}`);

  assert.equal(this.$().text().trim(), '1234');
});<% } else if (testType == 'unit') { %>
import { <%= camelizedModuleName %> } from '<%= dasherizedModulePrefix %>/helpers/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';

module('<%= friendlyTestName %>');

// TODO: Replace this with your real tests.
test('it works', function(assert) {
  let result = <%= camelizedModuleName %>([42]);
  assert.ok(result);
});
<% } %>
