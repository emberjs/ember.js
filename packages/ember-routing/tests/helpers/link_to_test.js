var Router, App, AppView, templates, router, eventDispatcher;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = Router.create({
    location: 'none'
  });

  Ember.run(function() {
    router._activeViews.application = AppView.create().appendTo('#qunit-fixture');
    router.startRouting();
  });
}

module("The {{linkTo}} helper", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Namespace.create();
      App.toString = function() { return "App"; };

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link'}}About{{/linkTo}}");
      Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>About</h3>{{#linkTo home id='home-link'}}Home{{/linkTo}}");
      Ember.TEMPLATES.item = Ember.Handlebars.compile("<h3>Item</h3><p>{{name}}</p>{{#linkTo home id='home-link'}}Home{{/linkTo}}");

      AppView = Ember.View.extend({
        template: Ember.TEMPLATES.app
      });

      Router = Ember.Router.extend({
        namespace: App,
        templates: Ember.TEMPLATES
      });

      eventDispatcher = Ember.EventDispatcher.create();
      eventDispatcher.setup();
    });
  },

  teardown: function() {
    Ember.run(function() { eventDispatcher.destroy(); });
  }
});

test("The {{linkTo}} helper moves into the named route", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/about").to("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Home)', '#qunit-fixture').length, 1, "The home template was rendered");

  console.log(Ember.$('#qunit-fixture')[0]);

  Ember.run(function() {
    Ember.$('a', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(About)', '#qunit-fixture').length, 1, "The about template was rendered");
});

test("The {{linkTo}} helper moves into the named route with context", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/about").to("about");
    match("/item/:id").to("item");
  });

  Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>List</h3><ul>{{#each controller}}<li>{{#linkTo item this}}{{name}}{{/linkTo}}<li>{{/each}}</ul>{{#linkTo home id='home-link'}}Home{{/linkTo}}");

  var people = {
    yehuda: "Yehuda Katz",
    tom: "Tom Dale",
    erik: "Erik Brynroflsson"
  };

  App.AboutRoute = Ember.Route.extend({
    model: function() {
      return Ember.A([
        { id: "yehuda", name: "Yehuda Katz" },
        { id: "tom", name: "Tom Dale" },
        { id: "erik", name: "Erik Brynroflsson" }
      ]);
    }
  });

  App.ItemRoute = Ember.Route.extend({
    serialize: function(object) {
      return { id: object.id };
    },

    deserialize: function(params) {
      return { id: params.id, name: people[params.id] };
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('h3:contains(List)', '#qunit-fixture').length, 1, "The home template was rendered");
  equal(Ember.$('#home-link').attr('href'), '/', "The home link points back at /");

  Ember.run(function() {
    Ember.$('li a:contains(Yehuda)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Yehuda Katz", "The name is correct");

  Ember.run(function() { Ember.$('#home-link').click(); });
  Ember.run(function() { Ember.$('#about-link').click(); });

  equal(Ember.$('li a:contains(Yehuda)').attr('href'), "/item/yehuda");
  equal(Ember.$('li a:contains(Tom)').attr('href'), "/item/tom");
  equal(Ember.$('li a:contains(Erik)').attr('href'), "/item/erik");

  Ember.run(function() {
    Ember.$('li a:contains(Erik)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Erik Brynroflsson", "The name is correct");
});

