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

module("The {{link-to}} helper", {
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
      Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}");
      Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>About</h3>{{#link-to 'index' id='home-link'}}Home{{/link-to}}{{#link-to 'about' id='self-link'}}Self{{/link-to}}");
      Ember.TEMPLATES.item = Ember.Handlebars.compile("<h3>Item</h3><p>{{name}}</p>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

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
    Ember.TEMPLATES = {};
  }
});

test("The {{link-to}} helper moves into the named route", function() {
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

test("The {{link-to}} helper supports URL replacement", function() {
  var setCount = 0,
      replaceCount = 0;

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'about' id='about-link' replace=true}}About{{/link-to}}");

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

test("the {{link-to}} helper doesn't add an href when the tagName isn't 'a'", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#link-to 'about' id='about-link' tagName='div'}}About{{/link-to}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link').attr('href'), undefined, "there is no href attribute");
});


test("the {{link-to}} applies a 'disabled' class when disabled", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable"}}About{{/link-to}}');
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

test("the {{link-to}} doesn't apply a 'disabled' class if disabledWhen is not provided", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link"}}About{{/link-to}}');

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  ok(!Ember.$('#about-link', '#qunit-fixture').hasClass("disabled"), "The link is not disabled if disabledWhen not provided");
});

test("the {{link-to}} helper supports a custom disabledClass", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable" disabledClass="do-not-want"}}About{{/link-to}}');
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

test("the {{link-to}} helper does not respond to clicks when disabled", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable"}}About{{/link-to}}');
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

test("The {{link-to}} helper supports a custom activeClass", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link' activeClass='zomg-active'}}Self{{/link-to}}");

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

test("The {{link-to}} helper supports leaving off .index for nested routes", function() {
  Router.map(function() {
    this.resource("about", function() {
      this.route("item");
    });
  });

  Ember.TEMPLATES.about = compile("<h1>About</h1>{{outlet}}");
  Ember.TEMPLATES['about/index'] = compile("<div id='index'>Index</div>");
  Ember.TEMPLATES['about/item'] = compile("<div id='item'>{{#link-to 'about'}}About{{/link-to}}</div>");

  bootApplication();

  Ember.run(router, 'handleURL', '/about/item');

  equal(normalizeUrl(Ember.$('#item a', '#qunit-fixture').attr('href')), '/about');
});

test("The {{link-to}} helper supports custom, nested, currentWhen", function() {
  Router.map(function(match) {
    this.resource("index", { path: "/" }, function() {
      this.route("about");
    });

    this.route("item");
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = Ember.Handlebars.compile("{{#link-to 'item' id='other-link' currentWhen='index'}}ITEM{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active since currentWhen is a parent route");
});

test("The {{link-to}} helper defaults to bubbling", function() {
  Ember.TEMPLATES.about = Ember.Handlebars.compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact'}}About{{/link-to}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = Ember.Handlebars.compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    actions: {
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

test("The {{link-to}} helper supports bubbles=false", function() {
  Ember.TEMPLATES.about = Ember.Handlebars.compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact' bubbles=false}}About{{/link-to}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = Ember.Handlebars.compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    actions: {
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

test("The {{link-to}} helper moves into the named route with context", function() {
  Router.map(function(match) {
    this.route("about");
    this.resource("item", { path: "/item/:id" });
  });

  Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>List</h3><ul>{{#each controller}}<li>{{#link-to 'item' this}}{{name}}{{/link-to}}<li>{{/each}}</ul>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

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

test("The {{link-to}} helper binds some anchor html tag common attributes", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'index' id='self-link' title='title-attr' rel='rel-attr'}}Self{{/link-to}}");
  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  var link = Ember.$('#self-link', '#qunit-fixture');
  equal(link.attr('title'), 'title-attr', "The self-link contains title attribute");
  equal(link.attr('rel'), 'rel-attr', "The self-link contains rel attribute");
});

test("The {{link-to}} helper accepts string/numeric arguments", function() {
  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
    this.route('post',   { path: '/post/:post_id' });
    this.route('repo',   { path: '/repo/:owner/:name' });
  });

  App.FilterController = Ember.Controller.extend({
    filter: "unpopular",
    repo: Ember.Object.create({owner: 'ember', name: 'ember.js'}),
    post_id: 123
  });
  Ember.TEMPLATES.filter = compile('<p>{{filter}}</p>{{#link-to "filter" "unpopular" id="link"}}Unpopular{{/link-to}}{{#link-to "filter" filter id="path-link"}}Unpopular{{/link-to}}{{#link-to "post" post_id id="post-path-link"}}Post{{/link-to}}{{#link-to "post" 123 id="post-number-link"}}Post{{/link-to}}{{#link-to "repo" repo id="repo-object-link"}}Repo{{/link-to}}');

  Ember.TEMPLATES.index = compile('');

  bootApplication();

  Ember.run(function() { router.handleURL("/filters/popular"); });

  equal(normalizeUrl(Ember.$('#link', '#qunit-fixture').attr('href')), "/filters/unpopular");
  equal(normalizeUrl(Ember.$('#path-link', '#qunit-fixture').attr('href')), "/filters/unpopular");
  equal(normalizeUrl(Ember.$('#post-path-link', '#qunit-fixture').attr('href')), "/post/123");
  equal(normalizeUrl(Ember.$('#post-number-link', '#qunit-fixture').attr('href')), "/post/123");
  equal(normalizeUrl(Ember.$('#repo-object-link', '#qunit-fixture').attr('href')), "/repo/ember/ember.js");
});

test("The {{link-to}} helper unwraps controllers", function() {
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
  Ember.TEMPLATES.index = compile('{{#link-to "filter" this id="link"}}Filter{{/link-to}}');

  bootApplication();

  Ember.run(function() { router.handleURL("/"); });

  Ember.$('#link', '#qunit-fixture').trigger('click');
});

test("The {{link-to}} helper doesn't change view context", function() {
  App.IndexView = Ember.View.extend({
    elementId: 'index',
    name: 'test'
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{view.name}}-{{#link-to 'index' id='self-link'}}Link: {{view.name}}{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#index', '#qunit-fixture').text(), 'test-Link: test', "accesses correct view");
});

test("Quoteless route param performs property lookup", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#link-to 'index' id='string-link'}}string{{/link-to}}{{#link-to foo id='path-link'}}path{{/link-to}}{{#link-to view.foo id='view-link'}}{{view.foo}}{{/link-to}}");

  function assertEquality(href) {
    equal(normalizeUrl(Ember.$('#string-link', '#qunit-fixture').attr('href')), '/');
    equal(normalizeUrl(Ember.$('#path-link', '#qunit-fixture').attr('href')), href);
    equal(normalizeUrl(Ember.$('#view-link', '#qunit-fixture').attr('href')), href);
  }

  App.IndexView = Ember.View.extend({
    foo: 'index',
    elementId: 'index-view'
  });

  App.IndexController = Ember.Controller.extend({
    foo: 'index'
  });

  App.Router.map(function() {
    this.route('about');
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  assertEquality('/');

  var controller = container.lookup('controller:index'),
      view = Ember.View.views['index-view'];
  Ember.run(function() {
    controller.set('foo', 'about');
    view.set('foo', 'about');
  });

  assertEquality('/about');
});

test("link-to with null/undefined dynamic parameters are put in a loading state", function() {

  expect(19);

  var oldWarn = Ember.Logger.warn, warnCalled = false;
  Ember.Logger.warn = function() { warnCalled = true; };
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#link-to destinationRoute routeContext loadingClass='i-am-loading' id='context-link'}}string{{/link-to}}{{#link-to secondRoute loadingClass='i-am-loading' id='static-link'}}string{{/link-to}}");

  var thing = Ember.Object.create({ id: 123 });

  App.IndexController = Ember.Controller.extend({
    destinationRoute: null,
    routeContext: null
  });

  App.AboutRoute = Ember.Route.extend({
    activate: function() {
      ok(true, "About was entered");
    }
  });

  App.Router.map(function() {
    this.route('thing', { path: '/thing/:thing_id' });
    this.route('about');
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  function assertLinkStatus($link, url) {
    if (url) {
      equal(normalizeUrl($link.attr('href')), url, "loaded link-to has expected href");
      ok(!$link.hasClass('i-am-loading'), "loaded linkView has no loadingClass");
    } else {
      equal(normalizeUrl($link.attr('href')), '#', "unloaded link-to has href='#'");
      ok($link.hasClass('i-am-loading'), "loading linkView has loadingClass");
    }
  }

  var $contextLink = Ember.$('#context-link', '#qunit-fixture'),
      $staticLink = Ember.$('#static-link', '#qunit-fixture'),
      controller = container.lookup('controller:index');

  assertLinkStatus($contextLink);
  assertLinkStatus($staticLink);

  Ember.run(function() {
    warnCalled = false;
    $contextLink.click();
    ok(warnCalled, "Logger.warn was called from clicking loading link");
  });

  // Set the destinationRoute (context is still null).
  Ember.run(controller, 'set', 'destinationRoute', 'thing');
  assertLinkStatus($contextLink);

  // Set the routeContext to an id
  Ember.run(controller, 'set', 'routeContext', '456');
  assertLinkStatus($contextLink, '/thing/456');

  // Test that 0 isn't interpreted as falsy.
  Ember.run(controller, 'set', 'routeContext', 0);
  assertLinkStatus($contextLink, '/thing/0');

  // Set the routeContext to an object
  Ember.run(controller, 'set', 'routeContext', thing);
  assertLinkStatus($contextLink, '/thing/123');

  // Set the destinationRoute back to null.
  Ember.run(controller, 'set', 'destinationRoute', null);
  assertLinkStatus($contextLink);

  Ember.run(function() {
    warnCalled = false;
    $staticLink.click();
    ok(warnCalled, "Logger.warn was called from clicking loading link");
  });

  Ember.run(controller, 'set', 'secondRoute', 'about');
  assertLinkStatus($staticLink, '/about');

  // Click the now-active link
  Ember.run($staticLink, 'click');

  Ember.Logger.warn = oldWarn;
});

test("The {{link-to}} helper refreshes href element when one of params changes", function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var post = Ember.Object.create({id: '1'}),
      secondPost = Ember.Object.create({id: '2'});

  Ember.TEMPLATES.index = compile('{{#link-to "post" post id="post"}}post{{/link-to}}');

  App.IndexController = Ember.Controller.extend();
  var indexController = container.lookup('controller:index');

  Ember.run(function() { indexController.set('post', post); });

  bootApplication();

  Ember.run(function() { router.handleURL("/"); });

  equal(normalizeUrl(Ember.$('#post', '#qunit-fixture').attr('href')), '/posts/1', 'precond - Link has rendered href attr properly');

  Ember.run(function() { indexController.set('post', secondPost); });

  equal(Ember.$('#post', '#qunit-fixture').attr('href'), '/posts/2', 'href attr was updated after one of the params had been changed');

  Ember.run(function() { indexController.set('post', null); });

  equal(Ember.$('#post', '#qunit-fixture').attr('href'), '#', 'href attr becomes # when one of the arguments in nullified');
});

test("The {{link-to}} helper's bound parameter functionality works as expected in conjunction with an ObjectProxy/Controller", function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var post = Ember.Object.create({id: '1'}),
      secondPost = Ember.Object.create({id: '2'});

  Ember.TEMPLATES = {
    index: compile(''),
    post:  compile('{{#link-to "post" this id="self-link"}}selflink{{/link-to}}')
  };

  App.PostController = Ember.ObjectController.extend();
  var postController = container.lookup('controller:post');

  bootApplication();

  Ember.run(router, 'transitionTo', 'post', post);

  var $link = Ember.$('#self-link', '#qunit-fixture');
  equal(normalizeUrl($link.attr('href')), '/posts/1', 'self link renders post 1');

  Ember.run(postController, 'set', 'content', secondPost);
  var linkView = Ember.View.views['self-link'];

  equal(normalizeUrl($link.attr('href')), '/posts/2', 'self link updated to post 2');
});

test("{{linkTo}} is aliased", function() {
  equal(Ember.Handlebars.helpers.linkTo, Ember.Handlebars.helpers['link-to']);
});

test("The {{link-to}} helper is active when a resource is active", function() {
  Router.map(function() {
    this.resource("about", function() {
      this.route("item");
    });
  });

  Ember.TEMPLATES.about = compile("<div id='about'>{{#link-to 'about' id='about-link'}}About{{/link-to}} {{#link-to 'about.item' id='item-link'}}Item{{/link-to}} {{outlet}}</div>");
  Ember.TEMPLATES['about/item'] = compile("");
  Ember.TEMPLATES['about/index'] = compile("");

  bootApplication();

  Ember.run(router, 'handleURL', '/about');

  equal(Ember.$('#about-link.active', '#qunit-fixture').length, 1, "The about resource link is active");
  equal(Ember.$('#item-link.active', '#qunit-fixture').length, 0, "The item route link is inactive");

  Ember.run(router, 'handleURL', '/about/item');

  equal(Ember.$('#about-link.active', '#qunit-fixture').length, 1, "The about resource link is active");
  equal(Ember.$('#item-link.active', '#qunit-fixture').length, 1, "The item route link is active");

});
