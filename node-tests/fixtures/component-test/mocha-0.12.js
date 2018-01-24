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
    // Template block usage:
    // this.render(hbs`
    //   {{#x-foo}}
    //     template content
    //   {{/x-foo}}
    // `);

    this.render(hbs`{{x-foo}}`);
    expect(this.$()).to.have.length(1);
  });
});
