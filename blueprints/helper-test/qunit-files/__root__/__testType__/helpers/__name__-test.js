import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('<%= dasherizedModuleName %>', 'helper:<%= dasherizedModuleName %>', {
  integration: true,
});

// TODO: Replace this with your real tests.
test('it renders', function (assert) {
  this.set('inputValue', '1234');

  this.render(hbs`{{<%= dasherizedModuleName %> this.inputValue}}`);

  assert.strictEqual(this.$().text().trim(), '1234');
});
