import "ember";

import { objectControllerDeprecation } from "ember-runtime/controllers/object_controller";
import EmberHandlebars from "ember-htmlbars/compat";

var compile = EmberHandlebars.compile;

var Router, App, AppView, router, registry, container;
var set = Ember.set;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

// IE includes the host name
function normalizeUrl(url) {
  return url.replace(/https?:\/\/[^\/]+/, '');
}

function shouldNotBeActive(selector) {
  checkActive(selector, false);
}

function shouldBeActive(selector) {
  checkActive(selector, true);
}

function checkActive(selector, active) {
  var classList = Ember.$(selector, '#qunit-fixture')[0].className;
  equal(classList.indexOf('active') > -1, active, selector + " active should be " + active.toString());
}

var updateCount, replaceCount;

function sharedSetup() {
  App = Ember.Application.create({
    name: "App",
    rootElement: '#qunit-fixture'
  });

  App.deferReadiness();

  updateCount = replaceCount = 0;
  App.Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
      setURL(path) {
        updateCount++;
        set(this, 'path', path);
      },

      replaceURL(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router = App.Router;
  registry = App.registry;
  container = App.__container__;
}

function sharedTeardown() {
  Ember.run(function() { App.destroy(); });
  Ember.TEMPLATES = {};
}

QUnit.module("The {{link-to}} helper", {
  setup() {
    Ember.run(function() {

      sharedSetup();

      Ember.TEMPLATES.app = compile("{{outlet}}");
      Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}");
      Ember.TEMPLATES.about = compile("<h3>About</h3>{{#link-to 'index' id='home-link'}}Home{{/link-to}}{{#link-to 'about' id='self-link'}}Self{{/link-to}}");
      Ember.TEMPLATES.item = compile("<h3>Item</h3><p>{{model.name}}</p>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

      AppView = Ember.View.extend({
        templateName: 'app'
      });

      registry.register('view:app', AppView);

      registry.unregister('router:main');
      registry.register('router:main', Router);
    });
  },

  teardown: sharedTeardown
});

QUnit.test("The {{link-to}} helper moves into the named route", function() {
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

QUnit.test("The {{link-to}} helper supports URL replacement", function() {

  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#link-to 'about' id='about-link' replace=true}}About{{/link-to}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(updateCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(updateCount, 0, 'setURL should not be called');
  equal(replaceCount, 1, 'replaceURL should be called once');
});

QUnit.test("the {{link-to}} helper doesn't add an href when the tagName isn't 'a'", function() {
  Ember.TEMPLATES.index = compile("{{#link-to 'about' id='about-link' tagName='div'}}About{{/link-to}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link').attr('href'), undefined, "there is no href attribute");
});


QUnit.test("the {{link-to}} applies a 'disabled' class when disabled", function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable"}}About{{/link-to}}');
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

QUnit.test("the {{link-to}} doesn't apply a 'disabled' class if disabledWhen is not provided", function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link"}}About{{/link-to}}');

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  ok(!Ember.$('#about-link', '#qunit-fixture').hasClass("disabled"), "The link is not disabled if disabledWhen not provided");
});

QUnit.test("the {{link-to}} helper supports a custom disabledClass", function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable" disabledClass="do-not-want"}}About{{/link-to}}');
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

QUnit.test("the {{link-to}} helper does not respond to clicks when disabled", function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable"}}About{{/link-to}}');
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

QUnit.test("The {{link-to}} helper supports a custom activeClass", function() {
  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link' activeClass='zomg-active'}}Self{{/link-to}}");

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

QUnit.test("The {{link-to}} helper supports leaving off .index for nested routes", function() {
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

QUnit.test("The {{link-to}} helper supports currentWhen (DEPRECATED)", function() {
  expectDeprecation('Using currentWhen with {{link-to}} is deprecated in favor of `current-when`.');

  Router.map(function(match) {
    this.resource("index", { path: "/" }, function() {
      this.route("about");
    });

    this.route("item");
  });

  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = compile("{{#link-to 'item' id='other-link' currentWhen='index'}}ITEM{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active since current-when is a parent route");
});

QUnit.test("The {{link-to}} helper supports custom, nested, current-when", function() {
  Router.map(function(match) {
    this.resource("index", { path: "/" }, function() {
      this.route("about");
    });

    this.route("item");
  });

  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = compile("{{#link-to 'item' id='other-link' current-when='index'}}ITEM{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active since current-when is a parent route");
});

QUnit.test("The {{link-to}} helper does not disregard current-when when it is given explicitly for a resource", function() {
  Router.map(function(match) {
    this.resource("index", { path: "/" }, function() {
      this.route("about");
    });

    this.resource("items", function() {
      this.route('item');
    });
  });

  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = compile("{{#link-to 'items' id='other-link' current-when='index'}}ITEM{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active when current-when is given for explicitly for a resource");
});

QUnit.test("The {{link-to}} helper supports multiple current-when routes", function() {
  Router.map(function(match) {
    this.resource("index", { path: "/" }, function() {
      this.route("about");
    });
    this.route("item");
    this.route("foo");
  });

  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = compile("{{#link-to 'item' id='link1' current-when='item index'}}ITEM{{/link-to}}");
  Ember.TEMPLATES['item'] = compile("{{#link-to 'item' id='link2' current-when='item index'}}ITEM{{/link-to}}");
  Ember.TEMPLATES['foo'] = compile("{{#link-to 'item' id='link3' current-when='item index'}}ITEM{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#link1.active', '#qunit-fixture').length, 1, "The link is active since current-when contains the parent route");

  Ember.run(function() {
    router.handleURL("/item");
  });

  equal(Ember.$('#link2.active', '#qunit-fixture').length, 1, "The link is active since you are on the active route");

  Ember.run(function() {
    router.handleURL("/foo");
  });

  equal(Ember.$('#link3.active', '#qunit-fixture').length, 0, "The link is not active since current-when does not contain the active route");
});

QUnit.test("The {{link-to}} helper defaults to bubbling", function() {
  Ember.TEMPLATES.about = compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact'}}About{{/link-to}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    actions: {
      hide() {
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

QUnit.test("The {{link-to}} helper supports bubbles=false", function() {
  Ember.TEMPLATES.about = compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact' bubbles=false}}About{{/link-to}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    actions: {
      hide() {
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

QUnit.test("The {{link-to}} helper moves into the named route with context", function() {
  Router.map(function(match) {
    this.route("about");
    this.resource("item", { path: "/item/:id" });
  });

  Ember.TEMPLATES.about = compile("<h3>List</h3><ul>{{#each person in model}}<li>{{#link-to 'item' person}}{{person.name}}{{/link-to}}</li>{{/each}}</ul>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

  App.AboutRoute = Ember.Route.extend({
    model() {
      return Ember.A([
        { id: "yehuda", name: "Yehuda Katz" },
        { id: "tom", name: "Tom Dale" },
        { id: "erik", name: "Erik Brynroflsson" }
      ]);
    }
  });

  App.ItemRoute = Ember.Route.extend({
    serialize(object) {
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

QUnit.test("The {{link-to}} helper binds some anchor html tag common attributes", function() {
  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#link-to 'index' id='self-link' title='title-attr' rel='rel-attr' tabindex='-1'}}Self{{/link-to}}");
  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  var link = Ember.$('#self-link', '#qunit-fixture');
  equal(link.attr('title'), 'title-attr', "The self-link contains title attribute");
  equal(link.attr('rel'), 'rel-attr', "The self-link contains rel attribute");
  equal(link.attr('tabindex'), '-1', "The self-link contains tabindex attribute");
});

QUnit.test("The {{link-to}} helper supports `target` attribute", function() {
  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#link-to 'index' id='self-link' target='_blank'}}Self{{/link-to}}");
  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  var link = Ember.$('#self-link', '#qunit-fixture');
  equal(link.attr('target'), '_blank', "The self-link contains `target` attribute");
});

QUnit.test("The {{link-to}} helper does not call preventDefault if `target` attribute is provided", function() {
  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#link-to 'index' id='self-link' target='_blank'}}Self{{/link-to}}");
  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  var event = Ember.$.Event("click");
  Ember.$('#self-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, "should not preventDefault when target attribute is specified");
});

QUnit.test("The {{link-to}} helper should preventDefault when `target = _self`", function() {
  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#link-to 'index' id='self-link' target='_self'}}Self{{/link-to}}");
  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  var event = Ember.$.Event("click");
  Ember.$('#self-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), true, "should preventDefault when target attribute is `_self`");
});

QUnit.test("The {{link-to}} helper should not transition if target is not equal to _self or empty", function() {
  Ember.TEMPLATES.index = compile("{{#link-to 'about' id='about-link' replace=true target='_blank'}}About{{/link-to}}");

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

  notEqual(container.lookup('controller:application').get('currentRouteName'), 'about', 'link-to should not transition if target is not equal to _self or empty');
});

QUnit.test("The {{link-to}} helper accepts string/numeric arguments", function() {
  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
    this.route('post', { path: '/post/:post_id' });
    this.route('repo', { path: '/repo/:owner/:name' });
  });

  App.FilterController = Ember.Controller.extend({
    filter: "unpopular",
    repo: Ember.Object.create({ owner: 'ember', name: 'ember.js' }),
    post_id: 123
  });
  Ember.TEMPLATES.filter = compile('<p>{{filter}}</p>{{#link-to "filter" "unpopular" id="link"}}Unpopular{{/link-to}}{{#link-to "filter" filter id="path-link"}}Unpopular{{/link-to}}{{#link-to "post" post_id id="post-path-link"}}Post{{/link-to}}{{#link-to "post" 123 id="post-number-link"}}Post{{/link-to}}{{#link-to "repo" repo id="repo-object-link"}}Repo{{/link-to}}');

  Ember.TEMPLATES.index = compile(' ');

  bootApplication();

  Ember.run(function() { router.handleURL("/filters/popular"); });

  equal(normalizeUrl(Ember.$('#link', '#qunit-fixture').attr('href')), "/filters/unpopular");
  equal(normalizeUrl(Ember.$('#path-link', '#qunit-fixture').attr('href')), "/filters/unpopular");
  equal(normalizeUrl(Ember.$('#post-path-link', '#qunit-fixture').attr('href')), "/post/123");
  equal(normalizeUrl(Ember.$('#post-number-link', '#qunit-fixture').attr('href')), "/post/123");
  equal(normalizeUrl(Ember.$('#repo-object-link', '#qunit-fixture').attr('href')), "/repo/ember/ember.js");
});

QUnit.test("Issue 4201 - Shorthand for route.index shouldn't throw errors about context arguments", function() {
  expect(2);
  Router.map(function() {
    this.resource('lobby', function() {
      this.route('index', { path: ':lobby_id' });
      this.route('list');
    });
  });

  App.LobbyIndexRoute = Ember.Route.extend({
    model(params) {
      equal(params.lobby_id, 'foobar');
      return params.lobby_id;
    }
  });

  Ember.TEMPLATES['lobby/index'] = compile("{{#link-to 'lobby' 'foobar' id='lobby-link'}}Lobby{{/link-to}}");
  Ember.TEMPLATES.index = compile("");
  Ember.TEMPLATES['lobby/list'] = compile("{{#link-to 'lobby' 'foobar' id='lobby-link'}}Lobby{{/link-to}}");
  bootApplication();
  Ember.run(router, 'handleURL', '/lobby/list');
  Ember.run(Ember.$('#lobby-link'), 'click');
  shouldBeActive('#lobby-link');

});

QUnit.test("The {{link-to}} helper unwraps controllers", function() {

  if (Ember.FEATURES.isEnabled('ember-routing-transitioning-classes')) {
    expect(5);
  } else {
    expect(6);
  }

  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
  });

  var indexObject = { filter: 'popular' };

  App.FilterRoute = Ember.Route.extend({
    model(params) {
      return indexObject;
    },

    serialize(passedObject) {
      equal(passedObject, indexObject, "The unwrapped object is passed");
      return { filter: 'popular' };
    }
  });

  App.IndexRoute = Ember.Route.extend({
    model() {
      return indexObject;
    }
  });

  Ember.TEMPLATES.filter = compile('<p>{{model.filter}}</p>');
  Ember.TEMPLATES.index = compile('{{#link-to "filter" this id="link"}}Filter{{/link-to}}');

  expectDeprecation(function() {
    bootApplication();
  }, /Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated./);

  Ember.run(function() { router.handleURL("/"); });

  Ember.$('#link', '#qunit-fixture').trigger('click');
});

QUnit.test("The {{link-to}} helper doesn't change view context", function() {
  App.IndexView = Ember.View.extend({
    elementId: 'index',
    name: 'test',
    isTrue: true
  });

  Ember.TEMPLATES.index = compile("{{view.name}}-{{#link-to 'index' id='self-link'}}Link: {{view.name}}-{{#if view.isTrue}}{{view.name}}{{/if}}{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#index', '#qunit-fixture').text(), 'test-Link: test-test', "accesses correct view");
});

QUnit.test("Quoteless route param performs property lookup", function() {
  Ember.TEMPLATES.index = compile("{{#link-to 'index' id='string-link'}}string{{/link-to}}{{#link-to foo id='path-link'}}path{{/link-to}}{{#link-to view.foo id='view-link'}}{{view.foo}}{{/link-to}}");

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

  var controller = container.lookup('controller:index');
  var view = Ember.View.views['index-view'];
  Ember.run(function() {
    controller.set('foo', 'about');
    view.set('foo', 'about');
  });

  assertEquality('/about');
});

QUnit.test("link-to with null/undefined dynamic parameters are put in a loading state", function() {

  expect(19);

  var oldWarn = Ember.Logger.warn;
  var warnCalled = false;
  Ember.Logger.warn = function() { warnCalled = true; };
  Ember.TEMPLATES.index = compile("{{#link-to destinationRoute routeContext loadingClass='i-am-loading' id='context-link'}}string{{/link-to}}{{#link-to secondRoute loadingClass='i-am-loading' id='static-link'}}string{{/link-to}}");

  var thing = Ember.Object.create({ id: 123 });

  App.IndexController = Ember.Controller.extend({
    destinationRoute: null,
    routeContext: null
  });

  App.AboutRoute = Ember.Route.extend({
    activate() {
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

  var $contextLink = Ember.$('#context-link', '#qunit-fixture');
  var $staticLink = Ember.$('#static-link', '#qunit-fixture');
  var controller = container.lookup('controller:index');

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

QUnit.test("The {{link-to}} helper refreshes href element when one of params changes", function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var post = Ember.Object.create({ id: '1' });
  var secondPost = Ember.Object.create({ id: '2' });

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

QUnit.test("The {{link-to}} helper's bound parameter functionality works as expected in conjunction with an ObjectProxy/Controller", function() {
  expectDeprecation(objectControllerDeprecation);

  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var post = Ember.Object.create({ id: '1' });
  var secondPost = Ember.Object.create({ id: '2' });

  Ember.TEMPLATES = {
    index: compile(' '),
    post:  compile('{{#link-to "post" this id="self-link"}}selflink{{/link-to}}')
  };

  App.PostController = Ember.ObjectController.extend();
  var postController = container.lookup('controller:post');

  bootApplication();

  Ember.run(router, 'transitionTo', 'post', post);

  var $link = Ember.$('#self-link', '#qunit-fixture');
  equal(normalizeUrl($link.attr('href')), '/posts/1', 'self link renders post 1');

  Ember.run(postController, 'set', 'model', secondPost);

  equal(normalizeUrl($link.attr('href')), '/posts/2', 'self link updated to post 2');
});

QUnit.test("{{linkTo}} is aliased", function() {
  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{#linkTo 'about' id='about-link' replace=true}}About{{/linkTo}}");

  Router.map(function() {
    this.route("about");
  });

  expectDeprecation(function() {
    bootApplication();
  }, "The 'linkTo' view helper is deprecated in favor of 'link-to'");

  Ember.run(function() {
    router.handleURL("/");
  });

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(container.lookup('controller:application').get('currentRouteName'), 'about', 'linkTo worked properly');
});

QUnit.test("The {{link-to}} helper is active when a resource is active", function() {
  Router.map(function() {
    this.resource("about", function() {
      this.route("item");
    });
  });

  Ember.TEMPLATES.about = compile("<div id='about'>{{#link-to 'about' id='about-link'}}About{{/link-to}} {{#link-to 'about.item' id='item-link'}}Item{{/link-to}} {{outlet}}</div>");
  Ember.TEMPLATES['about/item'] = compile(" ");
  Ember.TEMPLATES['about/index'] = compile(" ");

  bootApplication();

  Ember.run(router, 'handleURL', '/about');

  equal(Ember.$('#about-link.active', '#qunit-fixture').length, 1, "The about resource link is active");
  equal(Ember.$('#item-link.active', '#qunit-fixture').length, 0, "The item route link is inactive");

  Ember.run(router, 'handleURL', '/about/item');

  equal(Ember.$('#about-link.active', '#qunit-fixture').length, 1, "The about resource link is active");
  equal(Ember.$('#item-link.active', '#qunit-fixture').length, 1, "The item route link is active");

});

QUnit.test("The {{link-to}} helper works in an #each'd array of string route names", function() {
  Router.map(function() {
    this.route('foo');
    this.route('bar');
    this.route('rar');
  });

  App.IndexController = Ember.Controller.extend({
    routeNames: Ember.A(['foo', 'bar', 'rar']),
    route1: 'bar',
    route2: 'foo'
  });

  Ember.TEMPLATES = {
    index: compile('{{#each routeName in routeNames}}{{#link-to routeName}}{{routeName}}{{/link-to}}{{/each}}{{#each routeNames}}{{#link-to this}}{{this}}{{/link-to}}{{/each}}{{#link-to route1}}a{{/link-to}}{{#link-to route2}}b{{/link-to}}')
  };

  expectDeprecation(function() {
    bootApplication();
  }, 'Using the context switching form of {{each}} is deprecated. Please use the block param form (`{{#each bar as |foo|}}`) instead.');

  function linksEqual($links, expected) {
    equal($links.length, expected.length, "Has correct number of links");

    var idx;
    for (idx = 0; idx < $links.length; idx++) {
      var href = Ember.$($links[idx]).attr('href');
      // Old IE includes the whole hostname as well
      equal(href.slice(-expected[idx].length), expected[idx], "Expected link to be '"+expected[idx]+"', but was '"+href+"'");
    }
  }

  linksEqual(Ember.$('a', '#qunit-fixture'), ["/foo", "/bar", "/rar", "/foo", "/bar", "/rar", "/bar", "/foo"]);

  var indexController = container.lookup('controller:index');
  Ember.run(indexController, 'set', 'route1', 'rar');

  linksEqual(Ember.$('a', '#qunit-fixture'), ["/foo", "/bar", "/rar", "/foo", "/bar", "/rar", "/rar", "/foo"]);

  Ember.run(indexController.routeNames, 'shiftObject');

  linksEqual(Ember.$('a', '#qunit-fixture'), ["/bar", "/rar", "/bar", "/rar", "/rar", "/foo"]);
});

QUnit.test("The non-block form {{link-to}} helper moves into the named route", function() {
  expect(3);
  Router.map(function(match) {
    this.route("contact");
  });

  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{link-to 'Contact us' 'contact' id='contact-link'}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}");
  Ember.TEMPLATES.contact = compile("<h3>Contact</h3>{{link-to 'Home' 'index' id='home-link'}}{{link-to 'Self' 'contact' id='self-link'}}");

  bootApplication();

  Ember.run(function() {
    Ember.$('#contact-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Contact)', '#qunit-fixture').length, 1, "The contact template was rendered");
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#home-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");
});

QUnit.test("The non-block form {{link-to}} helper updates the link text when it is a binding", function() {
  expect(8);
  Router.map(function(match) {
    this.route("contact");
  });

  App.IndexController = Ember.Controller.extend({
    contactName: 'Jane'
  });

  Ember.TEMPLATES.index = compile("<h3>Home</h3>{{link-to contactName 'contact' id='contact-link'}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}");
  Ember.TEMPLATES.contact = compile("<h3>Contact</h3>{{link-to 'Home' 'index' id='home-link'}}{{link-to 'Self' 'contact' id='self-link'}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });
  var controller = container.lookup('controller:index');

  equal(Ember.$('#contact-link:contains(Jane)', '#qunit-fixture').length, 1, "The link title is correctly resolved");

  Ember.run(function() {
    controller.set('contactName', 'Joe');
  });
  equal(Ember.$('#contact-link:contains(Joe)', '#qunit-fixture').length, 1, "The link title is correctly updated when the bound property changes");

  Ember.run(function() {
    controller.set('contactName', 'Robert');
  });
  equal(Ember.$('#contact-link:contains(Robert)', '#qunit-fixture').length, 1, "The link title is correctly updated when the bound property changes a second time");

  Ember.run(function() {
    Ember.$('#contact-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Contact)', '#qunit-fixture').length, 1, "The contact template was rendered");
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#home-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");

  Ember.run(function() {
    Ember.$('#home-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Home)', '#qunit-fixture').length, 1, "The index template was rendered");
  equal(Ember.$('#contact-link:contains(Robert)', '#qunit-fixture').length, 1, "The link title is correctly updated when the route changes");
});

QUnit.test("The non-block form {{link-to}} helper moves into the named route with context", function() {
  expect(5);
  Router.map(function(match) {
    this.route("item", { path: "/item/:id" });
  });

  App.IndexRoute = Ember.Route.extend({
    model() {
      return Ember.A([
        { id: "yehuda", name: "Yehuda Katz" },
        { id: "tom", name: "Tom Dale" },
        { id: "erik", name: "Erik Brynroflsson" }
      ]);
    }
  });

  App.ItemRoute = Ember.Route.extend({
    serialize(object) {
      return { id: object.id };
    }
  });

  Ember.TEMPLATES.index = compile("<h3>Home</h3><ul>{{#each person in controller}}<li>{{link-to person.name 'item' person}}</li>{{/each}}</ul>");
  Ember.TEMPLATES.item = compile("<h3>Item</h3><p>{{model.name}}</p>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    Ember.$('li a:contains(Yehuda)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Yehuda Katz", "The name is correct");

  Ember.run(function() { Ember.$('#home-link').click(); });

  equal(normalizeUrl(Ember.$('li a:contains(Yehuda)').attr('href')), "/item/yehuda");
  equal(normalizeUrl(Ember.$('li a:contains(Tom)').attr('href')), "/item/tom");
  equal(normalizeUrl(Ember.$('li a:contains(Erik)').attr('href')), "/item/erik");

});

QUnit.test("The non-block form {{link-to}} performs property lookup", function() {
  Ember.TEMPLATES.index = compile("{{link-to 'string' 'index' id='string-link'}}{{link-to path foo id='path-link'}}{{link-to view.foo view.foo id='view-link'}}");

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

  var controller = container.lookup('controller:index');
  var view = Ember.View.views['index-view'];
  Ember.run(function() {
    controller.set('foo', 'about');
    view.set('foo', 'about');
  });

  assertEquality('/about');
});

QUnit.test("The non-block form {{link-to}} protects against XSS", function() {
  Ember.TEMPLATES.application = compile("{{link-to display 'index' id='link'}}");

  App.ApplicationController = Ember.Controller.extend({
    display: 'blahzorz'
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  var controller = container.lookup('controller:application');

  equal(Ember.$('#link', '#qunit-fixture').text(), 'blahzorz');
  Ember.run(function() {
    controller.set('display', '<b>BLAMMO</b>');
  });

  equal(Ember.$('#link', '#qunit-fixture').text(), '<b>BLAMMO</b>');
  equal(Ember.$('b', '#qunit-fixture').length, 0);
});

QUnit.test("the {{link-to}} helper calls preventDefault", function() {
  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  var event = Ember.$.Event("click");
  Ember.$('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), true, "should preventDefault");
});

QUnit.test("the {{link-to}} helper does not call preventDefault if `preventDefault=false` is passed as an option", function() {
  Ember.TEMPLATES.index = compile("{{#link-to 'about' id='about-link' preventDefault=false}}About{{/link-to}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  var event = Ember.$.Event("click");
  Ember.$('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, "should not preventDefault");
});

QUnit.test("the {{link-to}} helper does not throw an error if its route has exited", function() {
  expect(0);

  Ember.TEMPLATES.application = compile("{{#link-to 'index' id='home-link'}}Home{{/link-to}}{{#link-to 'post' defaultPost id='default-post-link'}}Default Post{{/link-to}}{{#if currentPost}}{{#link-to 'post' id='post-link'}}Post{{/link-to}}{{/if}}");

  App.ApplicationController = Ember.Controller.extend({
    needs: ['post'],
    currentPost: Ember.computed.alias('controllers.post.model')
  });

  App.PostController = Ember.Controller.extend({
    model: { id: 1 }
  });

  Router.map(function() {
    this.route("post", { path: 'post/:post_id' });
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  Ember.run(function() {
    Ember.$('#default-post-link', '#qunit-fixture').click();
  });

  Ember.run(function() {
    Ember.$('#home-link', '#qunit-fixture').click();
  });
});

QUnit.test("{{link-to}} active property respects changing parent route context", function() {
  Ember.TEMPLATES.application = compile(
    "{{link-to 'OMG' 'things' 'omg' id='omg-link'}} " +
    "{{link-to 'LOL' 'things' 'lol' id='lol-link'}} ");


  Router.map(function() {
    this.resource('things', { path: '/things/:name' }, function() {
      this.route('other');
    });
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/things/omg');
  shouldBeActive('#omg-link');
  shouldNotBeActive('#lol-link');

  Ember.run(router, 'handleURL', '/things/omg/other');
  shouldBeActive('#omg-link');
  shouldNotBeActive('#lol-link');

});

QUnit.test("{{link-to}} populates href with default query param values even without query-params object", function() {
  App.IndexController = Ember.Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  Ember.TEMPLATES.index = compile("{{#link-to 'index' id='the-link'}}Index{{/link-to}}");
  bootApplication();
  equal(Ember.$('#the-link').attr('href'), "/", "link has right href");
});

QUnit.test("{{link-to}} populates href with default query param values with empty query-params object", function() {
  App.IndexController = Ember.Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  Ember.TEMPLATES.index = compile("{{#link-to 'index' (query-params) id='the-link'}}Index{{/link-to}}");
  bootApplication();
  equal(Ember.$('#the-link').attr('href'), "/", "link has right href");
});

QUnit.test("{{link-to}} populates href with supplied query param values", function() {
  App.IndexController = Ember.Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  Ember.TEMPLATES.index = compile("{{#link-to 'index' (query-params foo='456') id='the-link'}}Index{{/link-to}}");
  bootApplication();
  equal(Ember.$('#the-link').attr('href'), "/?foo=456", "link has right href");
});

QUnit.test("{{link-to}} populates href with partially supplied query param values", function() {
  App.IndexController = Ember.Controller.extend({
    queryParams: ['foo', 'bar'],
    foo: '123',
    bar: 'yes'
  });

  Ember.TEMPLATES.index = compile("{{#link-to 'index' (query-params foo='456') id='the-link'}}Index{{/link-to}}");
  bootApplication();
  equal(Ember.$('#the-link').attr('href'), "/?foo=456", "link has right href");
});

QUnit.test("{{link-to}} populates href with partially supplied query param values, but omits if value is default value", function() {
  App.IndexController = Ember.Controller.extend({
    queryParams: ['foo', 'bar'],
    foo: '123',
    bar: 'yes'
  });

  Ember.TEMPLATES.index = compile("{{#link-to 'index' (query-params foo='123') id='the-link'}}Index{{/link-to}}");
  bootApplication();
  equal(Ember.$('#the-link').attr('href'), "/", "link has right href");
});

QUnit.test("{{link-to}} populates href with fully supplied query param values", function() {
  App.IndexController = Ember.Controller.extend({
    queryParams: ['foo', 'bar'],
    foo: '123',
    bar: 'yes'
  });

  Ember.TEMPLATES.index = compile("{{#link-to 'index' (query-params foo='456' bar='NAW') id='the-link'}}Index{{/link-to}}");
  bootApplication();
  equal(Ember.$('#the-link').attr('href'), "/?bar=NAW&foo=456", "link has right href");
});

QUnit.module("The {{link-to}} helper: invoking with query params", {
  setup() {
    Ember.run(function() {
      sharedSetup();

      App.IndexController = Ember.Controller.extend({
        queryParams: ['foo', 'bar', 'abool'],
        foo: '123',
        bar: 'abc',
        boundThing: "OMG",
        abool: true
      });

      App.AboutController = Ember.Controller.extend({
        queryParams: ['baz', 'bat'],
        baz: 'alex',
        bat: 'borf'
      });

      registry.unregister('router:main');
      registry.register('router:main', Router);
    });
  },

  teardown: sharedTeardown
});

QUnit.test("doesn't update controller QP properties on current route when invoked", function() {
  Ember.TEMPLATES.index = compile("{{#link-to 'index' id='the-link'}}Index{{/link-to}}");
  bootApplication();

  Ember.run(Ember.$('#the-link'), 'click');
  var indexController = container.lookup('controller:index');
  deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, "controller QP properties not");
});

QUnit.test("doesn't update controller QP properties on current route when invoked (empty query-params obj)", function() {
  Ember.TEMPLATES.index = compile("{{#link-to 'index' (query-params) id='the-link'}}Index{{/link-to}}");
  bootApplication();

  Ember.run(Ember.$('#the-link'), 'click');
  var indexController = container.lookup('controller:index');
  deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, "controller QP properties not");
});

QUnit.test("link-to with no params throws", function() {
  Ember.TEMPLATES.index = compile("{{#link-to id='the-link'}}Index{{/link-to}}");
  expectAssertion(function() {
    bootApplication();
  }, /one or more/);
});

QUnit.test("doesn't update controller QP properties on current route when invoked (empty query-params obj, inferred route)", function() {
  Ember.TEMPLATES.index = compile("{{#link-to (query-params) id='the-link'}}Index{{/link-to}}");
  bootApplication();

  Ember.run(Ember.$('#the-link'), 'click');
  var indexController = container.lookup('controller:index');
  deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, "controller QP properties not");
});

QUnit.test("updates controller QP properties on current route when invoked", function() {
  Ember.TEMPLATES.index = compile("{{#link-to 'index' (query-params foo='456') id='the-link'}}Index{{/link-to}}");
  bootApplication();

  Ember.run(Ember.$('#the-link'), 'click');
  var indexController = container.lookup('controller:index');
  deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, "controller QP properties updated");
});

QUnit.test("updates controller QP properties on current route when invoked (inferred route)", function() {
  Ember.TEMPLATES.index = compile("{{#link-to (query-params foo='456') id='the-link'}}Index{{/link-to}}");
  bootApplication();

  Ember.run(Ember.$('#the-link'), 'click');
  var indexController = container.lookup('controller:index');
  deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, "controller QP properties updated");
});

QUnit.test("updates controller QP properties on other route after transitioning to that route", function() {
  Router.map(function() {
    this.route('about');
  });

  Ember.TEMPLATES.index = compile("{{#link-to 'about' (query-params baz='lol') id='the-link'}}About{{/link-to}}");
  bootApplication();

  equal(Ember.$('#the-link').attr('href'), '/about?baz=lol');
  Ember.run(Ember.$('#the-link'), 'click');
  var aboutController = container.lookup('controller:about');
  deepEqual(aboutController.getProperties('baz', 'bat'), { baz: 'lol', bat: 'borf' }, "about controller QP properties updated");

  equal(container.lookup('controller:application').get('currentPath'), "about");
});

QUnit.test("supplied QP properties can be bound", function() {
  var indexController = container.lookup('controller:index');
  Ember.TEMPLATES.index = compile("{{#link-to (query-params foo=boundThing) id='the-link'}}Index{{/link-to}}");

  bootApplication();

  equal(Ember.$('#the-link').attr('href'), '/?foo=OMG');
  Ember.run(indexController, 'set', 'boundThing', "ASL");
  equal(Ember.$('#the-link').attr('href'), '/?foo=ASL');
});

QUnit.test("supplied QP properties can be bound (booleans)", function() {
  var indexController = container.lookup('controller:index');
  Ember.TEMPLATES.index = compile("{{#link-to (query-params abool=boundThing) id='the-link'}}Index{{/link-to}}");

  bootApplication();

  equal(Ember.$('#the-link').attr('href'), '/?abool=OMG');
  Ember.run(indexController, 'set', 'boundThing', false);
  equal(Ember.$('#the-link').attr('href'), '/?abool=false');

  Ember.run(Ember.$('#the-link'), 'click');

  deepEqual(indexController.getProperties('foo', 'bar', 'abool'), { foo: '123', bar: 'abc', abool: false });
});

QUnit.test("href updates when unsupplied controller QP props change", function() {
  var indexController = container.lookup('controller:index');
  Ember.TEMPLATES.index = compile("{{#link-to (query-params foo='lol') id='the-link'}}Index{{/link-to}}");

  bootApplication();

  equal(Ember.$('#the-link').attr('href'), '/?foo=lol');
  Ember.run(indexController, 'set', 'bar', 'BORF');
  equal(Ember.$('#the-link').attr('href'), '/?bar=BORF&foo=lol');
  Ember.run(indexController, 'set', 'foo', 'YEAH');
  equal(Ember.$('#the-link').attr('href'), '/?bar=BORF&foo=lol');
});

QUnit.test("The {{link-to}} applies activeClass when query params are not changed", function() {
  Ember.TEMPLATES.index = compile(
    "{{#link-to (query-params foo='cat') id='cat-link'}}Index{{/link-to}} " +
    "{{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}} " +
    "{{#link-to 'index' id='change-nothing'}}Index{{/link-to}}"
  );

  Ember.TEMPLATES.search = compile(
    "{{#link-to (query-params search='same') id='same-search'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='change') id='change-search'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='same' archive=true) id='same-search-add-archive'}}Index{{/link-to}} " +
    "{{#link-to (query-params archive=true) id='only-add-archive'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='same' archive=true) id='both-same'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='different' archive=true) id='change-one'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='different' archive=false) id='remove-one'}}Index{{/link-to}} " +
    "{{outlet}}"
  );

  Ember.TEMPLATES['search/results'] = compile(
    "{{#link-to (query-params sort='title') id='same-sort-child-only'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='same') id='same-search-parent-only'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='change') id='change-search-parent-only'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='same' sort='title') id='same-search-same-sort-child-and-parent'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='same' sort='author') id='same-search-different-sort-child-and-parent'}}Index{{/link-to}} " +
    "{{#link-to (query-params search='change' sort='title') id='change-search-same-sort-child-and-parent'}}Index{{/link-to}} " +
    "{{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}} "
  );

  Router.map(function() {
    this.resource("search", function() {
      this.route("results");
    });
  });

  App.SearchController = Ember.Controller.extend({
    queryParams: ['search', 'archive'],
    search: '',
    archive: false
  });

  App.SearchResultsController = Ember.Controller.extend({
    queryParams: ['sort', 'showDetails'],
    sort: 'title',
    showDetails: true
  });

  bootApplication();

  //Basic tests
  shouldNotBeActive('#cat-link');
  shouldNotBeActive('#dog-link');
  Ember.run(router, 'handleURL', '/?foo=cat');
  shouldBeActive('#cat-link');
  shouldNotBeActive('#dog-link');
  Ember.run(router, 'handleURL', '/?foo=dog');
  shouldBeActive('#dog-link');
  shouldNotBeActive('#cat-link');
  shouldBeActive('#change-nothing');

  //Multiple params
  Ember.run(function() {
    router.handleURL("/search?search=same");
  });
  shouldBeActive('#same-search');
  shouldNotBeActive('#change-search');
  shouldNotBeActive('#same-search-add-archive');
  shouldNotBeActive('#only-add-archive');
  shouldNotBeActive('#remove-one');

  Ember.run(function() {
    router.handleURL("/search?search=same&archive=true");
  });
  shouldBeActive('#both-same');
  shouldNotBeActive('#change-one');

  //Nested Controllers
  Ember.run(function() {
    // Note: this is kind of a strange case; sort's default value is 'title',
    // so this URL shouldn't have been generated in the first place, but
    // we should also be able to gracefully handle these cases.
    router.handleURL("/search/results?search=same&sort=title&showDetails=true");
  });
  //shouldBeActive('#same-sort-child-only');
  shouldBeActive('#same-search-parent-only');
  shouldNotBeActive('#change-search-parent-only');
  shouldBeActive('#same-search-same-sort-child-and-parent');
  shouldNotBeActive('#same-search-different-sort-child-and-parent');
  shouldNotBeActive('#change-search-same-sort-child-and-parent');
});

QUnit.test("The {{link-to}} applies active class when query-param is number", function() {
  Ember.TEMPLATES.index = compile(
    "{{#link-to (query-params page=pageNumber) id='page-link'}}Index{{/link-to}} ");

  App.IndexController = Ember.Controller.extend({
    queryParams: ['page'],
    page: 1,
    pageNumber: 5
  });

  bootApplication();

  shouldNotBeActive('#page-link');
  Ember.run(router, 'handleURL', '/?page=5');
  shouldBeActive('#page-link');
});

QUnit.test("The {{link-to}} applies active class when query-param is array", function() {
  Ember.TEMPLATES.index = compile(
    "{{#link-to (query-params pages=pagesArray) id='array-link'}}Index{{/link-to}} " +
    "{{#link-to (query-params pages=biggerArray) id='bigger-link'}}Index{{/link-to}} " +
    "{{#link-to (query-params pages=emptyArray) id='empty-link'}}Index{{/link-to}} "
  );

  App.IndexController = Ember.Controller.extend({
    queryParams: ['pages'],
    pages: [],
    pagesArray: [1,2],
    biggerArray: [1,2,3],
    emptyArray: []
  });

  bootApplication();

  shouldNotBeActive('#array-link');
  Ember.run(router, 'handleURL', '/?pages=%5B1%2C2%5D');
  shouldBeActive('#array-link');
  shouldNotBeActive('#bigger-link');
  shouldNotBeActive('#empty-link');
  Ember.run(router, 'handleURL', '/?pages=%5B2%2C1%5D');
  shouldNotBeActive('#array-link');
  shouldNotBeActive('#bigger-link');
  shouldNotBeActive('#empty-link');
  Ember.run(router, 'handleURL', '/?pages=%5B1%2C2%2C3%5D');
  shouldBeActive('#bigger-link');
  shouldNotBeActive('#array-link');
  shouldNotBeActive('#empty-link');
});

QUnit.test("The {{link-to}} helper applies active class to parent route", function() {
  App.Router.map(function() {
    this.resource('parent', function() {
      this.route('child');
    });
  });

  Ember.TEMPLATES.application = compile(
    "{{#link-to 'parent' id='parent-link'}}Parent{{/link-to}} " +
    "{{#link-to 'parent.child' id='parent-child-link'}}Child{{/link-to}} " +
    "{{#link-to 'parent' (query-params foo=cat) id='parent-link-qp'}}Parent{{/link-to}} " +
    "{{outlet}}"
  );

  App.ParentChildController = Ember.Controller.extend({
    queryParams: ['foo'],
    foo: 'bar'
  });

  bootApplication();
  shouldNotBeActive('#parent-link');
  shouldNotBeActive('#parent-child-link');
  shouldNotBeActive('#parent-link-qp');
  Ember.run(router, 'handleURL', '/parent/child?foo=dog');
  shouldBeActive('#parent-link');
  shouldNotBeActive('#parent-link-qp');
});

QUnit.test("The {{link-to}} helper disregards query-params in activeness computation when current-when specified", function() {
  App.Router.map(function() {
    this.route('parent');
  });

  Ember.TEMPLATES.application = compile(
    "{{#link-to 'parent' (query-params page=1) current-when='parent' id='app-link'}}Parent{{/link-to}} {{outlet}}");
  Ember.TEMPLATES.parent = compile(
    "{{#link-to 'parent' (query-params page=1) current-when='parent' id='parent-link'}}Parent{{/link-to}} {{outlet}}");

  App.ParentController = Ember.Controller.extend({
    queryParams: ['page'],
    page: 1
  });

  bootApplication();
  equal(Ember.$('#app-link').attr('href'), '/parent');
  shouldNotBeActive('#app-link');

  Ember.run(router, 'handleURL', '/parent?page=2');
  equal(Ember.$('#app-link').attr('href'), '/parent');
  shouldBeActive('#app-link');
  equal(Ember.$('#parent-link').attr('href'), '/parent');
  shouldBeActive('#parent-link');

  var parentController = container.lookup('controller:parent');
  equal(parentController.get('page'), 2);
  Ember.run(parentController, 'set', 'page', 3);
  equal(router.get('location.path'), '/parent?page=3');
  shouldBeActive('#app-link');
  shouldBeActive('#parent-link');

  Ember.$('#app-link').click();
  equal(router.get('location.path'), '/parent');
});

function basicEagerURLUpdateTest(setTagName) {
  expect(6);

  if (setTagName) {
    Ember.TEMPLATES.application = compile("{{outlet}}{{link-to 'Index' 'index' id='index-link'}}{{link-to 'About' 'about' id='about-link' tagName='span'}}");
  }

  bootApplication();
  equal(updateCount, 0);
  Ember.run(Ember.$('#about-link'), 'click');

  // URL should be eagerly updated now
  equal(updateCount, 1);
  equal(router.get('location.path'), '/about');

  // Resolve the promise.
  Ember.run(aboutDefer, 'resolve');
  equal(router.get('location.path'), '/about');

  // Shouldn't have called update url again.
  equal(updateCount, 1);
  equal(router.get('location.path'), '/about');
}

var aboutDefer, otherDefer;

if (!Ember.FEATURES.isEnabled('ember-routing-transitioning-classes')) {
  QUnit.module("The {{link-to}} helper: eager URL updating", {
    setup() {
      Ember.run(function() {
        sharedSetup();

        registry.unregister('router:main');
        registry.register('router:main', Router);

        Router.map(function() {
          this.route('about');
        });

        App.AboutRoute = Ember.Route.extend({
          model() {
            aboutDefer = Ember.RSVP.defer();
            return aboutDefer.promise;
          }
        });

        Ember.TEMPLATES.application = compile("{{outlet}}{{link-to 'Index' 'index' id='index-link'}}{{link-to 'About' 'about' id='about-link'}}");
      });
    },

    teardown() {
      sharedTeardown();
      aboutDefer = null;
    }
  });

  QUnit.test("invoking a link-to with a slow promise eager updates url", function() {
    basicEagerURLUpdateTest(false);
  });

  QUnit.test("when link-to eagerly updates url, the path it provides does NOT include the rootURL", function() {
    expect(2);

    // HistoryLocation is the only Location class that will cause rootURL to be
    // prepended to link-to href's right now
    var HistoryTestLocation = Ember.HistoryLocation.extend({
      location: {
        hash: '',
        hostname: 'emberjs.com',
        href: 'http://emberjs.com/app/',
        pathname: '/app/',
        protocol: 'http:',
        port: '',
        search: ''
      },

      // Don't actually touch the URL
      replaceState(path) {},
      pushState(path) {},

      setURL(path) {
        set(this, 'path', path);
      },

      replaceURL(path) {
        set(this, 'path', path);
      }
    });

    registry.register('location:historyTest', HistoryTestLocation);

    Router.reopen({
      location: 'historyTest',
      rootURL: '/app/'
    });

    bootApplication();

    // href should have rootURL prepended
    equal(Ember.$('#about-link').attr('href'), '/app/about');

    Ember.run(Ember.$('#about-link'), 'click');

    // Actual path provided to Location class should NOT have rootURL
    equal(router.get('location.path'), '/about');
  });

  QUnit.test("non `a` tags also eagerly update URL", function() {
    basicEagerURLUpdateTest(true);
  });

  QUnit.test("invoking a link-to with a promise that rejects on the run loop doesn't update url", function() {
    App.AboutRoute = Ember.Route.extend({
      model() {
        return Ember.RSVP.reject();
      }
    });

    bootApplication();
    Ember.run(Ember.$('#about-link'), 'click');

    // Shouldn't have called update url.
    equal(updateCount, 0);
    equal(router.get('location.path'), '', 'url was not updated');
  });

  QUnit.test("invoking a link-to whose transition gets aborted in will transition doesn't update the url", function() {
    App.IndexRoute = Ember.Route.extend({
      actions: {
        willTransition(transition) {
          ok(true, "aborting transition");
          transition.abort();
        }
      }
    });

    bootApplication();
    Ember.run(Ember.$('#about-link'), 'click');

    // Shouldn't have called update url.
    equal(updateCount, 0);
    equal(router.get('location.path'), '', 'url was not updated');
  });

}

if (Ember.FEATURES.isEnabled('ember-routing-transitioning-classes')) {

  QUnit.module("The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes", {
    setup() {
      Ember.run(function() {
        sharedSetup();

        registry.unregister('router:main');
        registry.register('router:main', Router);

        Router.map(function() {
          this.route('about');
          this.route('other');
        });

        App.AboutRoute = Ember.Route.extend({
          model() {
            aboutDefer = Ember.RSVP.defer();
            return aboutDefer.promise;
          }
        });

        App.OtherRoute = Ember.Route.extend({
          model() {
            otherDefer = Ember.RSVP.defer();
            return otherDefer.promise;
          }
        });


        Ember.TEMPLATES.application = compile("{{outlet}}{{link-to 'Index' 'index' id='index-link'}}{{link-to 'About' 'about' id='about-link'}}{{link-to 'Other' 'other' id='other-link'}}");
      });
    },

    teardown() {
      sharedTeardown();
      aboutDefer = null;
    }
  });

  QUnit.test("while a transition is underway", function() {
    expect(18);
    bootApplication();

    function assertHasClass(className) {
      var i = 1;
      while (i < arguments.length) {
        var $a = arguments[i];
        var shouldHaveClass = arguments[i+1];
        equal($a.hasClass(className), shouldHaveClass, $a.attr('id') + " should " + (shouldHaveClass ? '' : "not ") + "have class " + className);
        i +=2;
      }
    }

    var $index = Ember.$('#index-link');
    var $about = Ember.$('#about-link');
    var $other = Ember.$('#other-link');

    Ember.run($about, 'click');

    assertHasClass('active', $index, true, $about, false, $other, false);
    assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
    assertHasClass('ember-transitioning-out', $index, true, $about, false, $other, false);

    Ember.run(aboutDefer, 'resolve');

    assertHasClass('active', $index, false, $about, true, $other, false);
    assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
    assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);
  });

  QUnit.test("while a transition is underway with nested link-to's", function() {
    expect(54);

    Router.map(function() {
      this.route('parent-route', function() {
        this.route('about');
        this.route('other');
      });
    });

    App.ParentRouteAboutRoute = Ember.Route.extend({
      model() {
        aboutDefer = Ember.RSVP.defer();
        return aboutDefer.promise;
      }
    });

    App.ParentRouteOtherRoute = Ember.Route.extend({
      model() {
        otherDefer = Ember.RSVP.defer();
        return otherDefer.promise;
      }
    });

    Ember.TEMPLATES.application = compile(`
      {{outlet}}
      {{#link-to 'index' tagName='li'}}
        {{link-to 'Index' 'index' id='index-link'}}
      {{/link-to}}
      {{#link-to 'parent-route.about' tagName='li'}}
        {{link-to 'About' 'parent-route.about' id='about-link'}}
      {{/link-to}}
      {{#link-to 'parent-route.other' tagName='li'}}
        {{link-to 'Other' 'parent-route.other' id='other-link'}}
      {{/link-to}}
    `);

    bootApplication();

    function assertHasClass(className) {
      var i = 1;
      while (i < arguments.length) {
        var $a = arguments[i];
        var shouldHaveClass = arguments[i+1];
        equal($a.hasClass(className), shouldHaveClass, $a.attr('id') + " should " + (shouldHaveClass ? '' : "not ") + "have class " + className);
        i +=2;
      }
    }

    var $index = Ember.$('#index-link');
    var $about = Ember.$('#about-link');
    var $other = Ember.$('#other-link');

    Ember.run($about, 'click');

    assertHasClass('active', $index, true, $about, false, $other, false);
    assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
    assertHasClass('ember-transitioning-out', $index, true, $about, false, $other, false);

    Ember.run(aboutDefer, 'resolve');

    assertHasClass('active', $index, false, $about, true, $other, false);
    assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
    assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);

    Ember.run($other, 'click');

    assertHasClass('active', $index, false, $about, true, $other, false);
    assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, true);
    assertHasClass('ember-transitioning-out', $index, false, $about, true, $other, false);

    Ember.run(otherDefer, 'resolve');

    assertHasClass('active', $index, false, $about, false, $other, true);
    assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
    assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);

    Ember.run($about, 'click');

    assertHasClass('active', $index, false, $about, false, $other, true);
    assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
    assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, true);

    Ember.run(aboutDefer, 'resolve');

    assertHasClass('active', $index, false, $about, true, $other, false);
    assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
    assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);
  });
}
