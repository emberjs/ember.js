var App;

module("ember-testing", {
  teardown: function() {
    Ember.run(App, App.destroy);
    App.removeTestHelpers();
    App = null;
  }
});

test("Ember.Application#injectTestHelpers/#removeTestHelpers", function() {
  App = Ember.run(Ember.Application, Ember.Application.create);
  ok(!window.visit);
  ok(!App.testHelpers.visit);
  ok(!window.click);
  ok(!App.testHelpers.click);
  ok(!window.fillIn);
  ok(!App.testHelpers.fillIn);
  ok(!window.wait);
  ok(!App.testHelpers.wait);

  App.injectTestHelpers();

  ok(window.visit);
  ok(App.testHelpers.visit);
  ok(window.click);
  ok(App.testHelpers.click);
  ok(window.fillIn);
  ok(App.testHelpers.fillIn);
  ok(window.wait);
  ok(App.testHelpers.wait);

  App.removeTestHelpers();

  ok(!window.visit);
  ok(!App.testHelpers.visit);
  ok(!window.click);
  ok(!App.testHelpers.click);
  ok(!window.fillIn);
  ok(!App.testHelpers.fillIn);
  ok(!window.wait);
  ok(!App.testHelpers.wait);
});

test("Ember.Application#setupForTesting", function() {
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
});

test("Ember.Test.registerHelper/unregisterHelper", function() {
  expect(5);
  var appBooted = false;

  Ember.Test.registerHelper('boot', function(app) {
    Ember.run(app, app.advanceReadiness);
    appBooted = true;
    return window.wait();
  });

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
    App.injectTestHelpers();
  });

  ok(App.testHelpers.boot);
  ok(window.boot);

  window.boot().then(function() {
    ok(appBooted);

    App.removeTestHelpers();
    Ember.Test.unregisterHelper('boot');

    ok(!App.testHelpers.boot);
    ok(!window.boot);
  });

});

test("Setting a test adapter manually", function() {
  expect(1);
  var originalAdapter = Ember.Test.adapter, CustomAdapter;

  CustomAdapter = Ember.Test.Adapter.extend({
    asyncStart: function() {
      ok(true, "Correct adapter was used");
    }
  });

  Ember.run(function() {
    App = Ember.Application.create();
    Ember.Test.adapter = CustomAdapter.create();
    App.setupForTesting();
  });

  Ember.Test.adapter.asyncStart();

  Ember.Test.adapter = originalAdapter;
});

test("QUnitAdapter is used by default", function() {
  expect(1);
  var originalAdapter = Ember.Test.adapter, CustomAdapter;

  Ember.Test.adapter = null;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  ok(Ember.Test.adapter instanceof Ember.Test.QUnitAdapter);

  Ember.Test.adapter = originalAdapter;
});
