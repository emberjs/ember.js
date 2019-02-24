import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('x-foo', 'Integration | Component | x-foo', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`<XFoo />`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    <XFoo>
      template block text
    </XFoo>
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
