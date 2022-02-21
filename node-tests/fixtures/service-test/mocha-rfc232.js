import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'my-app/tests/helpers';

describe('Unit | Service | foo', function () {
  setupTest();

  // TODO: Replace this with your real tests.
  it('exists', function () {
    let service = this.owner.lookup('service:foo');
    expect(service).to.be.ok;
  });
});
