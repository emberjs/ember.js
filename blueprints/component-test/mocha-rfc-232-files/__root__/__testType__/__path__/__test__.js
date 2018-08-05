<% if (testType === 'integration') { %>import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupRenderingTest } from 'ember-mocha';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

describe('<%= friendlyTestDescription %>', function() {
  setupRenderingTest();

  it('renders', async function() {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`{{<%= componentPathName %>}}`);

    expect(this.element.textContent.trim()).to.equal('');

    // Template block usage:
    await render(hbs`
      {{#<%= componentPathName %>}}
        template block text
      {{/<%= componentPathName %>}}
    `);

    expect(this.element.textContent.trim()).to.equal('template block text');
  });
});<% } else if (testType === 'unit') { %>import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('<%= friendlyTestDescription %>', function() {
  setupTest();

  it('exists', function() {
    let component = this.owner.factoryFor('component:<%= componentPathName %>').create();
    expect(component).to.be.ok;
  });
});<% } %>
