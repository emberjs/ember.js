import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import Application from '@ember/application';
import { initialize } from '<%= modulePrefix %>/instance-initializers/<%= dasherizedModuleName %>';
<% if (destroyAppExists) { %>import destroyApp from '../../helpers/destroy-app';<% } else { %>import { run } from '@ember/runloop';<% } %>

describe('<%= friendlyTestName %>', function () {
  beforeEach(function () {
    this.TestApplication = Application.extend();
    this.TestApplication.instanceInitializer({
      name: 'initializer under test',
      initialize,
    });

    this.application = this.TestApplication.create({
      autoboot: false
    });
    
    this.instance = this.application.buildInstance();
  });
  afterEach(function () {
    <% if (destroyAppExists) { %>destroyApp(this.instance);<% } else { %>run(this.instance, 'destroy');<% } %>
    <% if (destroyAppExists) { %>destroyApp(this.application);<% } else { %>run(this.application, 'destroy');<% } %>
  });

  // TODO: Replace this with your real tests.
  it('works', async function () {
    await this.instance.boot();

    expect(true).to.be.ok;
  });
});
