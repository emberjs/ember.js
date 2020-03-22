import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('Unit | Route | foo', function() {
  setupTest();

  it('exists', function() {
    let route = this.owner.lookup('route:foo');
    expect(route).to.be.ok;
  });
});
