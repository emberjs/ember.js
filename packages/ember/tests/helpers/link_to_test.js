var Router, App, AppView, templates, router, eventDispatcher, container;
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

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link'}}About{{/linkTo}}{{#linkTo index id='self-link'}}Self{{/linkTo}}");
      Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>About</h3>{{#linkTo index id='home-link'}}Home{{/linkTo}}{{#linkTo about id='self-link'}}Self{{/linkTo}}");
      Ember.TEMPLATES.item = Ember.Handlebars.compile("<h3>Item</h3><p>{{name}}</p>{{#linkTo index id='home-link'}}Home{{/linkTo}}");

      AppView = Ember.View.extend({
        templateName: 'app'
      });

      container = App.__container__;

      container.register('view:app');
      container.register('router:main', Router);
    });
  },

  teardown: function() {
    Ember.run(function() { App.destroy(); });
  }
});

test("The {{linkTo}} helper moves into the named route", function() {
  Router.map(function(match) {
    this.route("about");
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

test("The {{linkTo}} helper supports URL replacement", function() {
  var setCount = 0,
      replaceCount = 0;

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link' replace=true}}About{{/linkTo}}");

  Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
      setURL: function(path) {
        setCount++;
        set(this, 'path', path);
      },

      replaceURL: function(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(setCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(setCount, 0, 'setURL should not be called');
  equal(replaceCount, 1, 'replaceURL should be called once');
});

test("the {{linkTo}} helper doesn't add an href when the tagName isn't 'a'", function(){
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#linkTo about id='about-link' tagName='div'}}About{{/linkTo}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link').attr('href'), undefined, "there is no href attribute");
});


test("the {{linkTo}} applies a 'disabled' class when disabled", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#linkTo about id="about-link" disabledWhen="shouldDisable"}}About{{/linkTo}}');
  App.IndexController = Ember.Controller.extend({
    shouldDisable: true
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link.disabled', '#qunit-fixture').length, 1, "The link is disabled when its disabledWhen is true");
});

test("the {{linkTo}} helper supports a custom disabledClass", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#linkTo about id="about-link" disabledWhen="shouldDisable" disabledClass="do-not-want"}}About{{/linkTo}}');
  App.IndexController = Ember.Controller.extend({
    shouldDisable: true
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link.do-not-want', '#qunit-fixture').length, 1, "The link can apply a custom disabled class");

});

test("the {{linkTo}} helper does not respond to clicks when disabled", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#linkTo about id="about-link" disabledWhen="shouldDisable"}}About{{/linkTo}}');
  App.IndexController = Ember.Controller.extend({
    shouldDisable: true
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(About)', '#qunit-fixture').length, 0, "Transitioning did not occur");
});

test("The {{linkTo}} helper supports a custom activeClass", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#linkTo about id='about-link'}}About{{/linkTo}}{{#linkTo index id='self-link' activeClass='zomg-active'}}Self{{/linkTo}}");

  Router.map(function() {
    this.route("about");
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
  Router.map(function() {
    this.resource("about", function() {
      this.route("item");
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
    this.resource("index", { path: "/" }, function() {
      this.route("about");
    });

    this.route("item");
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = Ember.Handlebars.compile("{{#linkTo item id='other-link' currentWhen='index'}}ITEM{{/linkTo}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active since currentWhen is a parent route");
});

test("The {{linkTo}} helper defaults to bubbling", function() {
  Ember.TEMPLATES.about = Ember.Handlebars.compile("<div {{action 'hide'}}>{{#linkTo 'about.contact' id='about-contact'}}About{{/linkTo}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = Ember.Handlebars.compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    events: {
      hide: function() {
        hidden++;
      }
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  Ember.run(function() {
    Ember.$('#about-contact', '#qunit-fixture').click();
  });

  equal(Ember.$("#contact", "#qunit-fixture").text(), "Contact", "precond - the link worked");

  equal(hidden, 1, "The link bubbles");
});

test("The {{linkTo}} helper supports bubbles=false", function() {
  Ember.TEMPLATES.about = Ember.Handlebars.compile("<div {{action 'hide'}}>{{#linkTo 'about.contact' id='about-contact' bubbles=false}}About{{/linkTo}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = Ember.Handlebars.compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    events: {
      hide: function() {
        hidden++;
      }
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  Ember.run(function() {
    Ember.$('#about-contact', '#qunit-fixture').click();
  });

  equal(Ember.$("#contact", "#qunit-fixture").text(), "Contact", "precond - the link worked");

  equal(hidden, 0, "The link didn't bubble");
});

test("The {{linkTo}} helper moves into the named route with context", function() {
  Router.map(function(match) {
    this.route("about");
    this.resource("item", { path: "/item/:id" });
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

test("The {{linkTo}} helper accepts string arguments", function() {
  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
  });

  Ember.TEMPLATES.filter = compile('<p>{{filter}}</p>{{#linkTo filter "unpopular" id="link"}}Unpopular{{/linkTo}}');
  Ember.TEMPLATES.index = compile('');

  bootApplication();

  Ember.run(function() { router.handleURL("/filters/popular"); });

  equal(Ember.$('#link', '#qunit-fixture').attr('href'), "/filters/unpopular");
});

test("The {{linkTo}} helper unwraps controllers", function() {
  // The serialize hook is called twice: once to generate the href for the
  // link and once to generate the URL when the link is clicked.
  expect(2);

  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
  });

  var indexObject = { filter: 'popular' };

  App.FilterRoute = Ember.Route.extend({
    model: function(params) {
      return indexObject;
    },

    serialize: function(passedObject) {
      equal(passedObject, indexObject, "The unwrapped object is passed");
      return { filter: 'popular' };
    }
  });

  App.IndexRoute = Ember.Route.extend({
    model: function() {
      return indexObject;
    }
  });

  Ember.TEMPLATES.filter = compile('<p>{{filter}}</p>');
  Ember.TEMPLATES.index = compile('{{#linkTo filter this id="link"}}Filter{{/linkTo}}');

  bootApplication();

  Ember.run(function() { router.handleURL("/"); });

  Ember.$('#link', '#qunit-fixture').trigger('click');
});

test("The {{linkTo}} helper doesn't change view context", function() {
  App.IndexView = Ember.View.extend({
    elementId: 'index',
    name: 'test'
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{view.name}}-{{#linkTo index id='self-link'}}Link: {{view.name}}{{/linkTo}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#index', '#qunit-fixture').text(), 'test-Link: test', "accesses correct view");
});
