import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'dummy/tests/helpers';

describe('Unit | Component | foo', function () {
  setupTest();

  it('exists', function () {
    let component = this.owner.factoryFor('component:foo').create();
    expect(component).to.be.ok;
  });
});
