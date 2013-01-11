var Router, App, AppView, templates, router, eventDispatcher, container, originalTemplates;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

// IE includes the host name
function normalizeUrl(url) {
  return url.replace(/https?:\/\/[^\/]+/,'');
}

function compile(template) {
  return Ember.Handlebars.compile(template);
}

module("The {{linkTo}} helper", {
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

      originalTemplates = Ember.$.extend({}, Ember.TEMPLATES);
      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link'}}About{{/linkTo}}{{#linkTo index id='self-link'}}Self{{/linkTo}}");
      Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>About</h3>{{#linkTo index id='home-link'}}Home{{/linkTo}}{{#linkTo about id='self-link'}}Self{{/linkTo}}");
      Ember.TEMPLATES.item = Ember.Handlebars.compile("<h3>Item</h3><p>{{name}}</p>{{#linkTo index id='home-link'}}Home{{/linkTo}}");

      AppView = Ember.View.extend({
        templateName: 'app'
      });

      container = App.__container__;

      container.register('view', 'app');
      container.register('router', 'main', Router);
    });
  },

  teardown: function() {
    Ember.TEMPLATES = originalTemplates;
    Ember.run(function() { App.destroy(); });
  }
});

test("The {{linkTo}} helper moves into the named route", function() {
  Router.map(function(match) {
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
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link'}}About{{/linkTo}}{{#linkTo index id='self-link' activeClass='zomg-active'}}Self{{/linkTo}}");

  Router.map(function(match) {
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

test("The {{linkTo}} helper supports leaving off .index for nested routes", function() {
  Router.map(function(match) {
    match("/about").to("about", function(match) {
      match("/item").to("item");
    });
  });

  Ember.TEMPLATES.about = compile("<h1>About</h1>{{outlet}}");
  Ember.TEMPLATES['about/index'] = compile("<div id='index'>Index</div>");
  Ember.TEMPLATES['about/item'] = compile("<div id='item'>{{#linkTo 'about'}}About{{/linkTo}}</div>");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about/item");
  });

  equal(Ember.$('#item a', '#qunit-fixture').attr('href'), '/about');
});

test("The {{linkTo}} helper supports custom, nested, currentWhen", function() {
  Router.map(function(match) {
    match("/").to("index", function(match) {
      match("/about").to("about");
    });
    match("/item").to("item");
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = Ember.Handlebars.compile("{{#linkTo item id='other-link' currentWhen='index'}}ITEM{{/linkTo}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active since currentWhen is a parent route");
});

test("The {{linkTo}} helper moves into the named route with context", function() {
  Router.map(function(match) {
    match("/about").to("about");
    match("/item/:id").to("item");
  });

  Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>List</h3><ul>{{#each controller}}<li>{{#linkTo item this}}{{name}}{{/linkTo}}<li>{{/each}}</ul>{{#linkTo index id='home-link'}}Home{{/linkTo}}");

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
  equal(normalizeUrl(Ember.$('#home-link').attr('href')), '/', "The home link points back at /");

  Ember.run(function() {
    Ember.$('li a:contains(Yehuda)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Yehuda Katz", "The name is correct");

  Ember.run(function() { Ember.$('#home-link').click(); });
  Ember.run(function() { Ember.$('#about-link').click(); });

  equal(normalizeUrl(Ember.$('li a:contains(Yehuda)').attr('href')), "/item/yehuda");
  equal(normalizeUrl(Ember.$('li a:contains(Tom)').attr('href')), "/item/tom");
  equal(normalizeUrl(Ember.$('li a:contains(Erik)').attr('href')), "/item/erik");

  Ember.run(function() {
    Ember.$('li a:contains(Erik)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Erik Brynroflsson", "The name is correct");
});

test("The {{linkTo}} helper binds some anchor html tag common attributes", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo index id='self-link' title='title-attr'}}Self{{/linkTo}}");
  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#self-link', '#qunit-fixture').attr('title'), 'title-attr', "The self-link contains title attribute");
});

test("The {{linkTo}} helper moves into the named route", function() {
  Router.map(function(match) {
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

test("The event should bubble by default", function() {
  var wasClicked = false,
      defaultPrevented = false;

  Router.map(function(match) {
    match("/about").to("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  Ember.$('#qunit-fixture').on('click', '#about-link', function(event) {
    defaultPrevented = event.isDefaultPrevented(),
    wasClicked = true;
  });

  Ember.$('#about-link', '#qunit-fixture').click();

  equal(Ember.$('h3:contains(About)', '#qunit-fixture').length, 1, "The about template was rendered");
  equal(wasClicked, true, "The click should have bubbled");
  equal(defaultPrevented, true, "The default action should have been prevented");
});

test("The event should not bubble if bubbles=false is passed", function() {
  var isPropagationStopped = false;

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link' bubbles=false}}About{{/linkTo}}{{#linkTo index id='self-link'}}Self{{/linkTo}}");

  Router.map(function(match) {
    match("/about").to("about");
  });

  bootApplication();

  Ember.$('#qunit-fixture').on('click', '#about-link', function(event) {
    isPropagationStopped = event.isPropagationStopped();
  });

  Ember.run(function() {
    router.handleURL("/");
  });

  Ember.$('#about-link', '#qunit-fixture').click();

  equal(Ember.$('h3:contains(About)', '#qunit-fixture').length, 1, "The about template was rendered");
  equal(isPropagationStopped, true, "Propagation should have stopped");
});
