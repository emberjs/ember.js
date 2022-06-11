<% if (testType === 'integration') { %>import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupRenderingTest } from '<%= modulePrefix %>/tests/helpers';
import { render } from '@ember/test-helpers';
<%= hbsImportStatement %>

describe('<%= friendlyTestDescription %>', function () {
  setupRenderingTest();

  it('renders', async function () {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<%= selfCloseComponent(componentName) %>`);

    expect(this.element.textContent.trim()).to.equal('');

    // Template block usage:
    await render(hbs`
      <%= openComponent(componentName) %>
        template block text
      <%= closeComponent(componentName) %>
    `);

    expect(this.element.textContent.trim()).to.equal('template block text');
  });
});<% } else if (testType === 'unit') { %>import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from '<%= modulePrefix %>/tests/helpers';

describe('<%= friendlyTestDescription %>', function () {
  setupTest();

  it('exists', function () {
    let component = this.owner.factoryFor('component:<%= componentPathName %>').create();
    expect(component).to.be.ok;
  });
});<% } %>
