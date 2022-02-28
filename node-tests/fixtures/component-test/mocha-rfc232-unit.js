import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'my-app/tests/helpers';

describe('Unit | Component | x-foo', function () {
  setupTest();

  it('exists', function () {
    let component = this.owner.factoryFor('component:x-foo').create();
    expect(component).to.be.ok;
  });
});
