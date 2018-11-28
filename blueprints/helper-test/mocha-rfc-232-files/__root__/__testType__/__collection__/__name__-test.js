import { expect } from 'chai';
<% if (testType == 'integration') { %>import { describe, it } from 'mocha';
import { setupRenderingTest } from 'ember-mocha';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

describe('<%= friendlyTestName %>', function() {
  setupRenderingTest();

  // Replace this with your real tests.
  it('renders', async function() {
    this.set('inputValue', '1234');

    await render(hbs`{{<%= dasherizedModuleName %> inputValue}}`);

    expect(this.element.textContent.trim()).to.equal('1234');
  });
});<% } else if (testType == 'unit') { %>import { describe, it } from 'mocha';
import { <%= camelizedModuleName %> } from '<%= dasherizedPackageName %>/helpers/<%= dasherizedModuleName %>';

describe('<%= friendlyTestName %>', function() {

  // Replace this with your real tests.
  it('works', function() {
    let result = <%= camelizedModuleName %>(42);
    expect(result).to.be.ok;
  });
});<% } %>
