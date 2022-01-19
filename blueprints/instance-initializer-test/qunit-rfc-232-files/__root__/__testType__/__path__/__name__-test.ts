import Application from '@ember/application';

import config from '<%= modulePrefix %>/config/environment';
import { initialize } from '<%= modulePrefix %>/instance-initializers/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';
import Resolver from 'ember-resolver';
<% if (destroyAppExists) { %>import destroyApp from '../../helpers/destroy-app';<% } else { %>import { run } from '@ember/runloop';<% } %>

module('<%= friendlyTestName %>', function (hooks) {
  hooks.beforeEach(function () {
    this.TestApplication = class TestApplication extends Application {
      modulePrefix = config.modulePrefix;
      podModulePrefix = config.podModulePrefix;
      Resolver = Resolver;
    };

    this.TestApplication.instanceInitializer({
      name: 'initializer under test',
      initialize,
    });

    this.application = this.TestApplication.create({
      autoboot: false
    });

    this.instance = this.application.buildInstance();
  });
  hooks.afterEach(function () {
    <% if (destroyAppExists) { %>destroyApp(this.instance);<% } else { %>run(this.instance, 'destroy');<% } %>
    <% if (destroyAppExists) { %>destroyApp(this.application);<% } else { %>run(this.application, 'destroy');<% } %>
  });

  // TODO: Replace this with your real tests.
  test('it works', async function (assert) {
    await this.instance.boot();

    assert.ok(true);
  });
});
