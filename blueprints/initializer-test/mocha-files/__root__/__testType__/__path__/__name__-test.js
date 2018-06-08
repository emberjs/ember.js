import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { run } from '@ember/runloop';
import Application from '@ember/application';
import { initialize } from '<%= modulePrefix %>/initializers/<%= dasherizedModuleName %>';
<% if (destroyAppExists) { %>import destroyApp from '../../helpers/destroy-app';<% } %>

describe('<%= friendlyTestName %>', function() {
  let application;

  beforeEach(function() {
    run(function() {
      application = Application.create();
      application.deferReadiness();
    });
  });

  afterEach(function() {
    <% if (destroyAppExists) { %>destroyApp(application);<% } else { %>run(application, 'destroy');<% } %>
  });

  // Replace this with your real tests.
  it('works', function() {
    initialize(application);

    // you would normally confirm the results of the initializer here
    expect(true).to.be.ok;
  });
});
