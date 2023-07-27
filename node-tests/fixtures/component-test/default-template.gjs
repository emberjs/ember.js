import { moduleForComponent, test } from 'ember-qunit';
import <%= componentInvocation =%> from 'my-app/components/<%= path =%><%= component =%>';

moduleForComponent('<%= path =%><%= component =%>', 'Integration | Component | <%= component =%>', {
  integration: true,
});

test('it renders', function (assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(<template><<%= componentInvocation =%> /></template>);

  assert.strictEqual(this.$().text().trim(), '');

  // Template block usage:
  this.render(<template>
    <<%= componentInvocation =%>>
      template block text
    </<%= componentInvocation =%>>
  </template>);

  assert.strictEqual(this.$().text().trim(), 'template block text');
});
