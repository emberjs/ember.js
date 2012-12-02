var Router, App, AppView, templates, router;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = Router.create();

  Ember.run(function() {
    router._container.view.application = AppView.create().appendTo('#qunit-fixture');
  });
}

module("Basic Routing", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Namespace.create();
      App.toString = function() { return "App"; };

      App.LoadingRoute = Ember.Route.extend({
      });

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Hours</h3>");
      Ember.TEMPLATES.homepage = Ember.TEMPLATES.home;

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

  App.HomeRoute = Ember.Route.extend({
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
});

test("The Homepage with explicit template name in renderTemplates", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplates: function() {
      this.render('homepage');
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
});

test("The Homepage with a `setupControllers` hook", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    setupControllers: function(controller) {
      set(controller, 'hours', Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]));
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  router._container.controller.home = Ember.Controller.create();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Homepage with a `setupControllers` hook modifying other controllers", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    setupControllers: function(controller) {
      set(this.controller('home'), 'hours', Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]));
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  router._container.controller.home = Ember.Controller.create();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Homepage getting its controller context via controllerContext", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]);
    },

    setupControllers: function(controller, model) {
      set(this.controller('home'), 'hours', model);
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  router._container.controller.home = Ember.Controller.create();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Homepage getting its controller context by deserializing the params hash", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  App.SpecialRoute = Ember.Route.extend({
    model: function(params) {
      return Ember.Object.create({
        menuItemId: params.menu_item_id
      });
    },

    setupControllers: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.menuItemId}}</p>"
  );

  bootApplication();

  router._container.controller.special = Ember.Controller.create();

  Ember.run(function() {
    router.handleURL("/specials/1");
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "1", "The model was used to render the template");
});
