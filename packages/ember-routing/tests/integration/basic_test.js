var Router, App, AppView, templates;

module("Basic Routing", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Namespace.create();
      App.toString = function() { return "App"; };

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Hours</h3>");

      AppView = Ember.View.extend({
        template: Ember.TEMPLATES.app
      });

      Router = Ember.Router.extend({
        namespace: App,
        templates: Ember.TEMPLATES
      });
    });
  }
});

test("The Homepage", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.LoadingRoute = Ember.Route.extend({
  });

  App.HomeRoute = Ember.Route.extend({
  });

  var router = Router.create();
  router._container.controller.home = Ember.Controller.create();

  Ember.run(function() {
    router._container.view.application = AppView.create().appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
});
