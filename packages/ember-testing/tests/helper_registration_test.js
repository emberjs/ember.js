import run from "ember-metal/run_loop";
import Test from "ember-testing/test";
import EmberApplication from "ember-application/system/application";

var App, appBooted, helperContainer;

function registerHelper(){
  Test.registerHelper('boot', function(app) {
    run(app, app.advanceReadiness);
    appBooted = true;
    return app.testHelpers.wait();
  });
}

function unregisterHelper(){
  Test.unregisterHelper('boot');
}

var originalAdapter = Test.adapter;

function setupApp(){
  appBooted = false;
  helperContainer = {};

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
    App.injectTestHelpers(helperContainer);
  });
}

function destroyApp(){
  if (App) {
    run(App, 'destroy');
    App = null;
  }
}

QUnit.module("Test - registerHelper/unregisterHelper", {
  teardown: function(){
    Test.adapter = originalAdapter;
    destroyApp();
  }
});

test("Helper gets registered", function() {
  expect(2);

  registerHelper();
  setupApp();

  ok(App.testHelpers.boot);
  ok(helperContainer.boot);
});

test("Helper is ran when called", function(){
  expect(1);

  registerHelper();
  setupApp();

  App.testHelpers.boot().then(function() {
    ok(appBooted);
  });
});

test("Helper can be unregistered", function(){
  expect(4);

  registerHelper();
  setupApp();

  ok(App.testHelpers.boot);
  ok(helperContainer.boot);

  unregisterHelper();

  setupApp();

  ok(!App.testHelpers.boot, "once unregistered the helper is not added to App.testHelpers");
  ok(!helperContainer.boot, "once unregistered the helper is not added to the helperContainer");
});

