import { run } from 'ember-metal';
import Test from '../test';
import { Application as EmberApplication } from 'ember-application';

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
  }
}

QUnit.module('Test - registerHelper/unregisterHelper', {
  teardown() {
    Test.adapter = originalAdapter;
    destroyApp();
  }
});

QUnit.test('Helper gets registered', function() {
  expect(2);

  registerHelper();
  setupApp();

  ok(App.testHelpers.boot);
  ok(helperContainer.boot);
});

QUnit.test('Helper is ran when called', function(assert) {
  let done = assert.async();
  assert.expect(1);

  registerHelper();
  setupApp();

  App.testHelpers.boot()
    .then(function() {
      assert.ok(appBooted);
    })
    .finally(done);
});

QUnit.test('Helper can be unregistered', function() {
  expect(4);

  registerHelper();
  setupApp();

  ok(App.testHelpers.boot);
  ok(helperContainer.boot);

  unregisterHelper();

  setupApp();

  ok(!App.testHelpers.boot, 'once unregistered the helper is not added to App.testHelpers');
  ok(!helperContainer.boot, 'once unregistered the helper is not added to the helperContainer');
});
