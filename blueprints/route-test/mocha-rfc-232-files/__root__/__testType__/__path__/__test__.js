import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('<%= friendlyTestDescription %>', function() {
  setupTest();

  it('exists', function() {
    let route = this.owner.lookup('route:<%= dasherizedModuleName %>');
    expect(route).to.be.ok;
  });
});
