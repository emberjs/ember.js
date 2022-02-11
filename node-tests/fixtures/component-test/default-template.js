import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('<%= path =%><%= component =%>', 'Integration | Component | <%= component =%>', {
  integration: true,
});

test('it renders', function (assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`<<%= componentInvocation =%> />`);

  assert.strictEqual(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    <<%= componentInvocation =%>>
      template block text
    </<%= componentInvocation =%>>
  `);

  assert.strictEqual(this.$().text().trim(), 'template block text');
});
