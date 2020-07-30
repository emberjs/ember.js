import Application from '@ember/application';

import { initialize } from 'my-app/instance-initializers/foo';
import { module, test } from 'qunit';
import Resolver from 'ember-resolver';
import { run } from '@ember/runloop';

module('Unit | Instance Initializer | foo', function(hooks) {
  hooks.beforeEach(function() {
    this.TestApplication = class TestApplication extends Application {}
    this.TestApplication.instanceInitializer({
      name: 'initializer under test',
      initialize
    });
    this.application = this.TestApplication.create({ autoboot: false, Resolver });
    this.instance = this.application.buildInstance();
  });
  hooks.afterEach(function() {
    run(this.instance, 'destroy');
    run(this.application, 'destroy');
  });

  // TODO: Replace this with your real tests.
  test('it works', async function(assert) {
    await this.instance.boot();

    assert.ok(true);
  });
});
