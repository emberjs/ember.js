require('ember-application');

var Router, App, AppView, templates, router, eventDispatcher, container;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = container.lookup('router:main');

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

      container = Ember.Application.buildContainer(App);

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link'}}About{{/linkTo}}{{#linkTo home id='self-link'}}Self{{/linkTo}}");
      Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>About</h3>{{#linkTo home id='home-link'}}Home{{/linkTo}}{{#linkTo about id='self-link'}}Self{{/linkTo}}");
      Ember.TEMPLATES.item = Ember.Handlebars.compile("<h3>Item</h3><p>{{name}}</p>{{#linkTo home id='home-link'}}Home{{/linkTo}}");

      Router = Ember.Router.extend({
        location: 'none'
      });

      AppView = Ember.View.extend({
        templateName: 'app'
      });

      container.register('view', 'app');
      container.register('router', 'main', Router);

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
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#about-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(About)', '#qunit-fixture').length, 1, "The about template was rendered");
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#home-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");
});

test("The {{linkTo}} helper supports a custom activeClass", function() {
  Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link'}}About{{/linkTo}}{{#linkTo home id='self-link' activeClass='zomg-active'}}Self{{/linkTo}}");

  Router.map(function(match) {
    match("/").to("home");
    match("/about").to("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Home)', '#qunit-fixture').length, 1, "The home template was rendered");
  equal(Ember.$('#self-link.zomg-active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#about-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");
});

test("The {{linkTo}} helper supports custom, nested, currentWhen", function() {
  Router.map(function(match) {
    match("/").to("home", function(match) {
      match("/").to("index");
      match("/about").to("about");
    });
    match("/item").to("item");
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES.about = Ember.Handlebars.compile("{{#linkTo item id='other-link' currentWhen='home'}}ITEM{{/linkTo}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active since currentWhen is a parent route");
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

