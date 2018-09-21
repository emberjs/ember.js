import { describe, it } from 'mocha';
import { expect } from 'chai';
import { setupApplicationTest } from 'ember-mocha';
import { visit, currentURL } from '@ember/test-helpers';

describe('<%= friendlyTestName %>', function() {
  setupApplicationTest();

  it('can visit /<%= dasherizedModuleName %>', async function() {
    await visit('/<%= dasherizedModuleName %>');
    expect(currentURL()).to.equal('/<%= dasherizedModuleName %>');
  });
});
