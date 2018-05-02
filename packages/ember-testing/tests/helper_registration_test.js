import { run } from '@ember/runloop';
import Test from '../lib/test';
import EmberApplication from '@ember/application';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

var App, appBooted, helperContainer;

function registerHelper() {
  Test.registerHelper('boot', function(app) {
    run(app, app.advanceReadiness);
    appBooted = true;
    return app.testHelpers.wait();
  });
}

function unregisterHelper() {
  Test.unregisterHelper('boot');
}

var originalAdapter = Test.adapter;

function setupApp() {
  appBooted = false;
  helperContainer = {};

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
    App.injectTestHelpers(helperContainer);
  });
}

function destroyApp() {
  if (App) {
    run(App, 'destroy');
    App = null;
    helperContainer = null;
  }
}

moduleFor(
  'Test - registerHelper/unregisterHelper',
  class extends AbstractTestCase {
    teardown() {
      Test.adapter = originalAdapter;
      destroyApp();
    }

    ['@test Helper gets registered'](assert) {
      assert.expect(2);

      registerHelper();
      setupApp();

      assert.ok(App.testHelpers.boot);
      assert.ok(helperContainer.boot);
    }

    ['@test Helper is ran when called'](assert) {
      let done = assert.async();
      assert.expect(1);

      registerHelper();
      setupApp();

      App.testHelpers
        .boot()
        .then(function() {
          assert.ok(appBooted);
        })
        .finally(done);
    }

    ['@test Helper can be unregistered'](assert) {
      assert.expect(4);

      registerHelper();
      setupApp();

      assert.ok(App.testHelpers.boot);
      assert.ok(helperContainer.boot);

      unregisterHelper();

      run(App, 'destroy');
      setupApp();

      assert.ok(
        !App.testHelpers.boot,
        'once unregistered the helper is not added to App.testHelpers'
      );
      assert.ok(
        !helperContainer.boot,
        'once unregistered the helper is not added to the helperContainer'
      );
    }
  }
);
