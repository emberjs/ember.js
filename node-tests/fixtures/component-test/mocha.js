import { expect } from 'chai';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent('x-foo', 'Integration | Component | x-foo',
  {
    integration: true
  },
  function() {
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
  }
);
