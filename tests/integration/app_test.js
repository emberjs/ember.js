var app;

module("Application boot", {
  setup: function() {
    var Router = Ember.Router.extend({
      root: Ember.Route.extend()
    });

    Ember.run(function() {
      app = Ember.Application.create({
        Router: Router,
        Store: DS.Store,
        FooController: Ember.Controller.extend()
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      app.destroy();
    });
  }
});

test("It injects the store into the router", function() {
  app.initialize();

  ok(app.getPath('stateManager.store') instanceof DS.Store, "the store was injected");
});

test("It injects the store into controllers", function() {
  app.initialize();

  ok(app.getPath('stateManager.fooController.store') instanceof DS.Store, "the store was injected");
});
