import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupComponentTest } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration | Component | x-foo', function() {
  setupComponentTest('x-foo', {
    integration: true
  });

  it('renders', function() {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.on('myAction', function(val) { ... });

    this.render(hbs`<XFoo />`);
    expect(this.$()).to.have.length(1);

    // Template block usage:
    this.render(hbs`
      <XFoo>
        template block text
      </XFoo>
    `);

    assert.equal(this.$().text().trim(), 'template block text');
  });
});
