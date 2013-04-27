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
  ok(!window.click);
  ok(!window.fillIn);
  ok(!window.wait);

  App.injectTestHelpers();

  ok(window.visit);
  ok(window.click);
  ok(window.fillIn);
  ok(window.find);
  ok(window.wait);

  App.removeTestHelpers();

  ok(!window.visit);
  ok(!window.click);
  ok(!window.fillIn);
  ok(!window.wait);
});

test("Ember.Application#setupForTesting", function() {
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
});
