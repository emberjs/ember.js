var App;

module("ember-testing", {
  teardown: function() {
    Ember.run(App, App.destroy);
    App = null;
  }
});

test("Ember.Application#injectTestHelpers", function() {
  App = Ember.run(Ember.Application, Ember.Application.create);
  ok(!window.visit);
  ok(!window.click);
  ok(!window.fillIn);
  // ok(!window.find); // window.find already exists
  Ember.run(App, App.injectTestHelpers);
  ok(window.visit);
  ok(window.click);
  ok(window.fillIn);
  ok(window.find);
});

test("Ember.Application#setupForTesting", function() {
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
  equal(window.EMBER_APP_BEING_TESTED, App);
});