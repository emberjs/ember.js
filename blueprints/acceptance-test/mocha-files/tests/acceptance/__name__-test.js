import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import startApp from '<%= dasherizedPackageName %>/tests/helpers/start-app';
import { run } from '@ember/runloop';

describe('<%= friendlyTestName %>', function() {
  let application;

  beforeEach(function() {
    application = startApp();
  });

  afterEach(function() {
    run(application, 'destroy');
  });

  it('can visit /<%= dasherizedModuleName %>', function() {
    visit('/<%= dasherizedModuleName %>');

    return andThen(() => {
      expect(currentURL()).to.equal('/<%= dasherizedModuleName %>');
    });
  });
});
