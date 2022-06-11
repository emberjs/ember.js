import { describe, it } from 'mocha';
import { expect } from 'chai';
import { setupApplicationTest } from 'dummy/tests/helpers';
import { visit, currentURL } from '@ember/test-helpers';

describe('Acceptance | foo', function () {
  setupApplicationTest();

  it('can visit /foo', async function () {
    await visit('/foo');
    expect(currentURL()).to.equal('/foo');
  });
});
