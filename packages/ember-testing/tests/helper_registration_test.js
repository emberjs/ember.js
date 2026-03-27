import { run } from '@ember/runloop';
import Test from '../lib/test';
import { getAdapter, setAdapter } from '../lib/test/adapter';
import EmberApplication from '@ember/application';
import { moduleFor, ModuleBasedTestResolver, AbstractTestCase } from 'internal-test-helpers';

let App, appBooted;

function registerHelper() {
  Test.registerHelper('boot', function (app) {
    run(app, app.advanceReadiness);
    appBooted = true;
    return app.testHelpers.wait();
  });
}

function unregisterHelper() {
  Test.unregisterHelper('boot');
}

const originalAdapter = getAdapter();

function setupApp() {
  appBooted = false;

  run(function () {
    App = EmberApplication.create({
      Resolver: ModuleBasedTestResolver,
    });
  });
}

function destroyApp() {
  if (App) {
    run(App, 'destroy');
    App = null;
  }
}

moduleFor(
  'Test - registerHelper/unregisterHelper',
  class extends AbstractTestCase {
    teardown() {
      setAdapter(originalAdapter);
      destroyApp();
    }

    ['@test Helper gets registered'](assert) {
      assert.expect(2);

      registerHelper();
      setupApp();

      assert.ok(App.testHelpers.boot);
    }

    ['@test Helper is ran when called'](assert) {
      let done = assert.async();
      assert.expect(1);

      registerHelper();
      setupApp();

      App.testHelpers
        .boot()
        .then(function () {
          assert.ok(appBooted);
        })
        .finally(done);
    }

    ['@test Helper can be unregistered'](assert) {
      assert.expect(4);

      registerHelper();
      setupApp();

      assert.ok(App.testHelpers.boot);

      unregisterHelper();

      run(App, 'destroy');
      setupApp();

      assert.ok(
        !App.testHelpers.boot,
        'once unregistered the helper is not added to App.testHelpers'
      );
    }
  }
);
