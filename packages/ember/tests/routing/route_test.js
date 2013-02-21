var Router, App, router, container, originalTemplates,
    things, thingController, thingsController, route;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

function compile(string) {
  return Ember.Handlebars.compile(string);
}

module("Ember.Route", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      container = App.__container__;

      originalTemplates = Ember.$.extend({}, Ember.TEMPLATES);
      Ember.TEMPLATES.application = compile("{{outlet}}");
      Ember.TEMPLATES.thing = compile("<h3>{{name}}</h3>");
      Ember.TEMPLATES.things = compile("{{#each this}}{{name}}{{/each}}");
    });
  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = originalTemplates;
    });
  }
});

test("if a conroller is given as a route context, it's model should be used as context and it's container should be used for lookup", function() {
  Router.map(function() {
    this.route("things", { path: "/" });
    this.route("thing", { path: "/:name" });
  });

  App.ThingsController = Ember.ArrayController.extend({
    itemController: 'thing'
  });

  App.ThingController = Ember.ObjectController.extend();

  things = Ember.A([{name: 'toto'}, {name: 'tata'}]);

  App.ThingsRoute = Ember.Route.extend({
    model: function() {
      return things;
    }
  });

  App.ThingRoute = Ember.Route.extend({
    routeName: 'thing'
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  route = container.lookup('route:thing');
  thingsController = container.lookup('controller:things');
  thingController = thingsController.get('firstObject');

  Ember.run(function() {
    route.setup(thingController);
  });
  equal(route.controller, thingController);
  equal(route.controller.get('model'), things[0]);
  equal(route.container, thingController.container);
  notEqual(thingController.container, route.router.container);
});
