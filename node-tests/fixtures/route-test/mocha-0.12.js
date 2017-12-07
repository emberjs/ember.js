import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('Unit | Route | foo', function() {
  setupTest('route:foo', {
    // Specify the other units that are required for this test.
    // needs: ['controller:foo']
  });

  it('exists', function() {
    let route = this.subject();
    expect(route).to.be.ok;
  });
});
