/* jshint expr:true */
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import startApp from '../helpers/start-app';
<% if (destroyAppExists) { %>import destroyApp from '../helpers/destroy-app';<% } else { %>import Ember from 'ember';<% } %>

describe('<%= friendlyTestName %>', function() {
  let application;

  beforeEach(function() {
    application = startApp();
  });

  afterEach(function() {
    <% if (destroyAppExists) { %>destroyApp(application);<% } else { %>Ember.run(application, 'destroy');<% } %>
  });

  it('can visit /<%= dasherizedModuleName %>', function() {
    visit('/<%= dasherizedModuleName %>');

    andThen(function() {
      expect(currentURL()).to.equal('/<%= dasherizedModuleName %>');
    });
  });
});
