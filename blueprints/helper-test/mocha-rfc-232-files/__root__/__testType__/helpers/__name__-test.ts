import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupRenderingTest } from '<%= modulePrefix %>/tests/helpers';
import { render } from '@ember/test-helpers';
<%= hbsImportStatement %>

describe('<%= friendlyTestName %>', function () {
  setupRenderingTest();

  // TODO: Replace this with your real tests.
  it('renders', async function () {
    this.set('inputValue', '1234');

    await render(hbs`{{<%= dasherizedModuleName %> this.inputValue}}`);

    expect(this.element.textContent.trim()).to.equal('1234');
  });
});
