import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from '<%= dasherizedPackageName %>/tests/helpers';

describe('<%= friendlyTestDescription %>', function () {
  setupTest();

  // TODO: Replace this with your real tests.
  it('exists', function () {
    let controller = this.owner.lookup('controller:<%= controllerPathName %>');
    expect(controller).to.be.ok;
  });
});
