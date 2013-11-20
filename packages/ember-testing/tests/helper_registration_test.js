var App, appBooted, helperContainer;

function registerHelper(){
  Ember.Test.registerHelper('boot', function(app) {
    Ember.run(app, app.advanceReadiness);
    appBooted = true;
    return app.testHelpers.wait();
  });
}

function unregisterHelper(){
  Ember.Test.unregisterHelper('boot');
}

function setupApp(){
  appBooted = false;
  helperContainer = {};

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
    App.injectTestHelpers(helperContainer);
  });
}

function destroyApp(){
  if (App) {
    Ember.run(App, 'destroy');
    App = null;
  }
}

module("Ember.Test - registerHelper/unregisterHelper", {
  teardown: function(){
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

