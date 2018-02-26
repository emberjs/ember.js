import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import startApp from '<%= dasherizedPackageName %>/tests/helpers/start-app';
<% if (destroyAppExists) { %>import destroyApp from '<%= dasherizedPackageName %>/tests/helpers/destroy-app';<% } else { %>import { run } from '@ember/runloop';<% } %>

describe('<%= friendlyTestName %>', function() {
  let application;

  beforeEach(function() {
    application = startApp();
  });

  afterEach(function() {
    <% if (destroyAppExists) { %>destroyApp(application);<% } else { %>run(application, 'destroy');<% } %>
  });

  it('can visit /<%= dasherizedModuleName %>', function() {
    visit('/<%= dasherizedModuleName %>');

    return andThen(() => {
      expect(currentURL()).to.equal('/<%= dasherizedModuleName %>');
    });
  });
});
