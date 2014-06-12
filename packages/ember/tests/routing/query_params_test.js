import "ember";
import {
  forEach,
  map
}  from "ember-metal/enumerable_utils";

var Router, App, AppView, templates, router, container;
var get = Ember.get;
var set = Ember.set;
var compile = Ember.Handlebars.compile;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

function handleURL(path) {
  return Ember.run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

function handleURLAborts(path) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'url: `' + path + '` was NOT to be handled');
    }, function(reason) {
      ok(reason && reason.message === "TransitionAborted",  'url: `' + path + '` was to be aborted');
    });
  });
}

function handleURLRejectsWith(path, expectedReason) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'expected handleURLing: `' + path + '` to fail');
    }, function(reason) {
      equal(expectedReason, reason);
    });
  });
}

var startingURL = '', expectedReplaceURL, expectedPushURL;

function setAndFlush(obj, prop, value) {
  Ember.run(obj, 'set', prop, value);
}

var TestLocation = Ember.NoneLocation.extend({
  initState: function() {
    this.set('path', startingURL);
  },

  setURL: function(path) {
    if (expectedReplaceURL) {
      ok(false, "pushState occurred but a replaceState was expected");
    }
    if (expectedPushURL) {
      equal(path, expectedPushURL, "an expected pushState occurred");
      expectedPushURL = null;
    }
    this.set('path', path);
  },

  replaceURL: function(path) {
    if (expectedPushURL) {
      ok(false, "replaceState occurred but a pushState was expected");
    }
    if (expectedReplaceURL) {
      equal(path, expectedReplaceURL, "an expected replaceState occurred");
      expectedReplaceURL = null;
    }
    this.set('path', path);
  }
});

function sharedSetup() {
  Ember.run(function() {
    App = Ember.Application.create({
      name: "App",
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    container = App.__container__;
    container.register('location:test', TestLocation);

    startingURL = expectedReplaceURL = expectedPushURL = '';

    App.Router.reopen({
      location: 'test'
    });

    Router = App.Router;

    App.LoadingRoute = Ember.Route.extend({
    });

    Ember.TEMPLATES.application = compile("{{outlet}}");
    Ember.TEMPLATES.home = compile("<h3>Hours</h3>");
  });
}

function sharedTeardown() {
  Ember.run(function() {
    App.destroy();
    App = null;

    Ember.TEMPLATES = {};
  });
}

if (Ember.FEATURES.isEnabled("query-params-new")) {

  QUnit.module("Routing w/ Query Params", {
    setup: function() {
      sharedSetup();
    },

    teardown: function() {
      sharedTeardown();
    }
  });

  test("Single query params can be set", function() {
    Router.map(function() {
      this.route("home", { path: '/' });
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123"
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', '456');

    equal(router.get('location.path'), "/?foo=456");

    setAndFlush(controller, 'foo', '987');
    equal(router.get('location.path'), "/?foo=987");
  });

  test("Query params can map to different url keys", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: [{ foo: 'other_foo', bar: { as: 'other_bar' } }],
      foo: "FOO",
      bar: "BAR"
    });

    bootApplication();
    equal(router.get('location.path'), "");

    var controller = container.lookup('controller:index');
    setAndFlush(controller, 'foo', 'LEX');

    equal(router.get('location.path'), "/?other_foo=LEX");
    setAndFlush(controller, 'foo', 'WOO');
    equal(router.get('location.path'), "/?other_foo=WOO");

    Ember.run(router, 'transitionTo', '/?other_foo=NAW');
    equal(controller.get('foo'), "NAW");

    setAndFlush(controller, 'bar', 'NERK');
    Ember.run(router, 'transitionTo', '/?other_bar=NERK&other_foo=NAW');
  });


  test("Routes have overridable serializeQueryParamKey hook", function() {
    App.IndexRoute = Ember.Route.extend({
      serializeQueryParamKey: Ember.String.dasherize
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: 'funTimes',
      funTimes: ""
    });

    bootApplication();
    equal(router.get('location.path'), "");

    var controller = container.lookup('controller:index');
    setAndFlush(controller, 'funTimes', 'woot');

    equal(router.get('location.path'), "/?fun-times=woot");
  });

  test("No replaceURL occurs on startup because default values don't show up in URL", function() {
    expect(0);

    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123"
    });

    expectedReplaceURL = "/?foo=123";

    bootApplication();
  });

  test("model hooks receives query params", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.IndexRoute = Ember.Route.extend({
      model: function(params) {
        deepEqual(params, { omg: 'lol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), "");
  });

  test("controllers won't be eagerly instantiated by internal query params logic", function() {
    expect(10);
    Router.map(function() {
      this.resource('cats', function() {
        this.route('index', { path: '/' });
      });
      this.route("home", { path: '/' });
      this.route("about");
    });

    Ember.TEMPLATES.home = compile("<h3>{{link-to 'About' 'about' (query-params lol='wat') id='link-to-about'}}</h3>");
    Ember.TEMPLATES.about = compile("<h3>{{link-to 'Home' 'home'  (query-params foo='naw')}}</h3>");
    Ember.TEMPLATES['cats/index'] = compile("<h3>{{link-to 'Cats' 'cats'  (query-params name='domino') id='cats-link'}}</h3>");

    var homeShouldBeCreated = false,
        aboutShouldBeCreated = false,
        catsIndexShouldBeCreated = false;

    App.HomeRoute = Ember.Route.extend({
      setup: function() {
        homeShouldBeCreated = true;
        this._super.apply(this, arguments);
      }
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123",
      init: function() {
        this._super();
        ok (homeShouldBeCreated, "HomeController should be created at this time");
      }
    });

    App.AboutRoute = Ember.Route.extend({
      setup: function() {
        aboutShouldBeCreated = true;
        this._super.apply(this, arguments);
      }
    });

    App.AboutController = Ember.Controller.extend({
      queryParams: ['lol'],
      lol: "haha",
      init: function() {
        this._super();
        ok (aboutShouldBeCreated, "AboutController should be created at this time");
      }
    });

    App.CatsIndexRoute = Ember.Route.extend({
      model: function(){
        return [];
      },
      setup: function() {
        catsIndexShouldBeCreated = true;
        this._super.apply(this, arguments);
      },
      setupController: function(controller, context) {
        controller.set('model', context);
      }
    });

    App.CatsIndexController = Ember.Controller.extend({
      queryParams: ['breed', 'name' ],
      breed: 'Golden',
      name: null,
      init: function() {
        this._super();
        ok (catsIndexShouldBeCreated, "CatsIndexController should be created at this time");
      }
    });

    bootApplication();

    equal(router.get('location.path'), "", 'url is correct');
    var controller = container.lookup('controller:home');
    setAndFlush(controller, 'foo', '456');
    equal(router.get('location.path'), "/?foo=456", 'url is correct');
    equal(Ember.$('#link-to-about').attr('href'), "/about?lol=wat", "link to about is correct");

    Ember.run(router, 'transitionTo', 'about');
    equal(router.get('location.path'), "/about", 'url is correct');

    Ember.run(router, 'transitionTo', 'cats');

    equal(router.get('location.path'), "/cats", 'url is correct');
    equal(Ember.$('#cats-link').attr('href'), "/cats?name=domino", "link to cats is correct");
    Ember.run(Ember.$('#cats-link'), 'click');
    equal(router.get('location.path'), "/cats?name=domino", 'url is correct');
  });

  test("model hooks receives query params (overridden by incoming url value)", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.IndexRoute = Ember.Route.extend({
      model: function(params) {
        deepEqual(params, { omg: 'yes' });
      }
    });

    startingURL = "/?omg=yes";
    bootApplication();

    equal(router.get('location.path'), "/?omg=yes");
  });

  test("Route#paramsFor fetches query params", function() {
    expect(1);

    Router.map(function() {
      this.route('index', { path: '/:something' });
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'fooapp'
    });

    App.IndexRoute = Ember.Route.extend({
      model: function(params, transition) {
        deepEqual(this.paramsFor('index'), { something: 'omg', foo: 'fooapp' }, "could retrieve params for index");
      }
    });

    startingURL = "/omg";
    bootApplication();
  });

  test("model hook can query prefix-less application params", function() {
    App.ApplicationController = Ember.Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.ApplicationRoute = Ember.Route.extend({
      model: function(params) {
        deepEqual(params, { appomg: 'applol' });
      }
    });

    App.IndexRoute = Ember.Route.extend({
      model: function(params) {
        deepEqual(params, { omg: 'lol' });
        deepEqual(this.paramsFor('application'), { appomg: 'applol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), "");
  });

  test("model hook can query prefix-less application params (overridden by incoming url value)", function() {
    App.ApplicationController = Ember.Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.ApplicationRoute = Ember.Route.extend({
      model: function(params) {
        deepEqual(params, { appomg: 'appyes' });
      }
    });

    App.IndexRoute = Ember.Route.extend({
      model: function(params) {
        deepEqual(params, { omg: 'yes' });
        deepEqual(this.paramsFor('application'), { appomg: 'appyes' });
      }
    });

    startingURL = "/?appomg=appyes&omg=yes";
    bootApplication();

    equal(router.get('location.path'), "/?appomg=appyes&omg=yes");
  });

  test("can opt into full transition by setting refreshModel in route queryParams", function() {
    expect(6);
    App.ApplicationController = Ember.Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    var appModelCount = 0;
    App.ApplicationRoute = Ember.Route.extend({
      model: function(params) {
        appModelCount++;
      }
    });

    var indexModelCount = 0;
    App.IndexRoute = Ember.Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      model: function(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          deepEqual(params, { omg: 'lex' });
        }
      }
    });

    bootApplication();

    equal(appModelCount, 1);
    equal(indexModelCount, 1);

    var indexController = container.lookup('controller:index');
    setAndFlush(indexController, 'omg', 'lex');

    equal(appModelCount, 1);
    equal(indexModelCount, 2);
  });

  test("Use Ember.get to retrieve query params 'refreshModel' configuration", function() {
    expect(6);
    App.ApplicationController = Ember.Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    var appModelCount = 0;
    App.ApplicationRoute = Ember.Route.extend({
      model: function(params) {
        appModelCount++;
      }
    });

    var indexModelCount = 0;
    App.IndexRoute = Ember.Route.extend({
      queryParams: Ember.Object.create({
        unknownProperty: function(keyName) {
          return {refreshModel: true};
        }
      }),
      model: function(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          deepEqual(params, { omg: 'lex' });
        }
      }
    });

    bootApplication();

    equal(appModelCount, 1);
    equal(indexModelCount, 1);

    var indexController = container.lookup('controller:index');
    setAndFlush(indexController, 'omg', 'lex');

    equal(appModelCount, 1);
    equal(indexModelCount, 2);
  });

  test("can use refreshModel even w URL changes that remove QPs from address bar", function() {
    expect(4);

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    var indexModelCount = 0;
    App.IndexRoute = Ember.Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      model: function(params) {
        indexModelCount++;

        var data;
        if (indexModelCount === 1) {
          data = 'foo';
        } else if (indexModelCount === 2) {
          data = 'lol';
        }

        deepEqual(params, { omg: data }, "index#model receives right data");
      }
    });

    startingURL = '/?omg=foo';
    bootApplication();
    handleURL('/');

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'lol');
  });

  test("can opt into a replace query by specifying replace:true in the Router config hash", function() {
    expect(2);
    App.ApplicationController = Ember.Controller.extend({
      queryParams: ['alex'],
      alex: 'matchneer'
    });

    App.ApplicationRoute = Ember.Route.extend({
      queryParams: {
        alex: {
          replace: true
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), "");

    var appController = container.lookup('controller:application');
    expectedReplaceURL = "/?alex=wallace";
    setAndFlush(appController, 'alex', 'wallace');
  });

  test("An explicit replace:false on a changed QP always wins and causes a pushState", function() {
    expect(3);
    App.ApplicationController = Ember.Controller.extend({
      queryParams: ['alex', 'steely'],
      alex: 'matchneer',
      steely: 'dan'
    });

    App.ApplicationRoute = Ember.Route.extend({
      queryParams: {
        alex: {
          replace: true
        },
        steely: {
          replace: false
        }
      }
    });

    bootApplication();

    var appController = container.lookup('controller:application');
    expectedPushURL = "/?alex=wallace&steely=jan";
    Ember.run(appController, 'setProperties', { alex: 'wallace', steely: 'jan' });

    expectedPushURL = "/?alex=wallace&steely=fran";
    Ember.run(appController, 'setProperties', { steely: 'fran' });

    expectedReplaceURL = "/?alex=sriracha&steely=fran";
    Ember.run(appController, 'setProperties', { alex: 'sriracha' });
  });

  test("can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent", function() {
    Ember.TEMPLATES.parent = Ember.Handlebars.compile('{{outlet}}');
    Ember.TEMPLATES['parent/child'] = Ember.Handlebars.compile("{{link-to 'Parent' 'parent' (query-params foo='change') id='parent-link'}}");

    App.Router.map(function() {
      this.resource('parent', function() {
        this.route('child');
      });
    });

    var parentModelCount = 0;
    App.ParentRoute = Ember.Route.extend({
      model: function() {
        parentModelCount++;
      },
      queryParams: {
        foo: {
          refreshModel: true
        }
      }
    });

    App.ParentController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'abc'
    });

    startingURL = '/parent/child?foo=lol';
    bootApplication();

    equal(parentModelCount, 1);

    var parentController = container.lookup('controller:parent');

    Ember.run(Ember.$('#parent-link'), 'click');

    equal(parentModelCount, 2);
  });

  test("Use Ember.get to retrieve query params 'replace' configuration", function() {
    expect(2);
    App.ApplicationController = Ember.Controller.extend({
      queryParams: ['alex'],
      alex: 'matchneer'
    });

    App.ApplicationRoute = Ember.Route.extend({
      queryParams: Ember.Object.create({
        unknownProperty: function(keyName) {
          // We are simulating all qps requiring refress
          return { replace: true };
        }
      })
    });

    bootApplication();

    equal(router.get('location.path'), "");

    var appController = container.lookup('controller:application');
    expectedReplaceURL = "/?alex=wallace";
    setAndFlush(appController, 'alex', 'wallace');
  });

  test("can override incoming QP values in setupController", function() {
    expect(3);

    App.Router.map(function() {
      this.route('about');
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.IndexRoute = Ember.Route.extend({
      setupController: function(controller) {
        ok(true, "setupController called");
        controller.set('omg', 'OVERRIDE');
      },
      actions: {
        queryParamsDidChange: function() {
          ok(false, "queryParamsDidChange shouldn't fire");
        }
      }
    });

    startingURL = "/about";
    bootApplication();
    equal(router.get('location.path'), "/about");
    Ember.run(router, 'transitionTo', 'index');
    equal(router.get('location.path'), "/?omg=OVERRIDE");
  });

  test("can override incoming QP array values in setupController", function() {
    expect(3);

    App.Router.map(function() {
      this.route('about');
    });

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: ['lol']
    });

    App.IndexRoute = Ember.Route.extend({
      setupController: function(controller) {
        ok(true, "setupController called");
        controller.set('omg', ['OVERRIDE']);
      },
      actions: {
        queryParamsDidChange: function() {
          ok(false, "queryParamsDidChange shouldn't fire");
        }
      }
    });

    startingURL = "/about";
    bootApplication();
    equal(router.get('location.path'), "/about");
    Ember.run(router, 'transitionTo', 'index');
    equal(router.get('location.path'), "/?omg=" + encodeURIComponent(JSON.stringify(['OVERRIDE'])));
  });

  test("URL transitions that remove QPs still register as QP changes", function() {
    expect(2);

    App.IndexController = Ember.Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    startingURL = "/?omg=borf";
    bootApplication();

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'borf');
    Ember.run(router, 'transitionTo', '/');
    equal(indexController.get('omg'), 'lol');
  });

  test("Subresource naming style is supported", function() {

    Router.map(function() {
      this.resource('abc.def', { path: '/abcdef' }, function() {
        this.route('zoo');
      });
    });

    Ember.TEMPLATES.application = compile("{{link-to 'A' 'abc.def' (query-params foo='123') id='one'}}{{link-to 'B' 'abc.def.zoo' (query-params foo='123' bar='456') id='two'}}{{outlet}}");

    App.AbcDefController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'lol'
    });

    App.AbcDefZooController = Ember.Controller.extend({
      queryParams: ['bar'],
      bar: 'haha'
    });

    bootApplication();
    equal(router.get('location.path'), "");
    equal(Ember.$('#one').attr('href'), "/abcdef?foo=123");
    equal(Ember.$('#two').attr('href'), "/abcdef/zoo?bar=456&foo=123");

    Ember.run(Ember.$('#one'), 'click');
    equal(router.get('location.path'), "/abcdef?foo=123");
    Ember.run(Ember.$('#two'), 'click');
    equal(router.get('location.path'), "/abcdef/zoo?bar=456&foo=123");
  });

  test("transitionTo supports query params", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'lol'
    });

    bootApplication();

    equal(router.get('location.path'), "");

    Ember.run(router, 'transitionTo', { queryParams: { foo: "borf" } });
    equal(router.get('location.path'), "/?foo=borf", "shorthand supported");
    Ember.run(router, 'transitionTo', { queryParams: { 'index:foo': "blaf" } });
    equal(router.get('location.path'), "/?foo=blaf", "longform supported");
    Ember.run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), "/?foo=false", "longform supported (bool)");
    Ember.run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), "/?foo=false", "shorhand supported (bool)");
  });

  test("transitionTo supports query params (multiple)", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: 'lol',
      bar: 'wat'
    });

    bootApplication();

    equal(router.get('location.path'), "");

    Ember.run(router, 'transitionTo', { queryParams: { foo: "borf" } });
    equal(router.get('location.path'), "/?foo=borf", "shorthand supported");
    Ember.run(router, 'transitionTo', { queryParams: { 'index:foo': "blaf" } });
    equal(router.get('location.path'), "/?foo=blaf", "longform supported");
    Ember.run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), "/?foo=false", "longform supported (bool)");
    Ember.run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), "/?foo=false", "shorhand supported (bool)");
  });

  test("setting controller QP to empty string doesn't generate null in URL", function() {
    expect(1);
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123"
    });

    bootApplication();
    var controller = container.lookup('controller:index');

    expectedPushURL = "/?foo=";
    setAndFlush(controller, 'foo', '');
  });

  test("A default boolean value deserializes QPs as booleans rather than strings", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: false
    });

    App.IndexRoute = Ember.Route.extend({
      model: function(params) {
        equal(params.foo, true, "model hook received foo as boolean true");
      }
    });

    startingURL = "/?foo=true";
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), true);

    handleURL('/?foo=false');
    equal(controller.get('foo'), false);
  });

  test("Query param without value are empty string", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: ''
    });

    startingURL = "/?foo=";
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), "");
  });

  test("Array query params can be set", function() {
    Router.map(function() {
      this.route("home", { path: '/' });
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: []
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', [1,2]);

    equal(router.get('location.path'), "/?foo=%5B1%2C2%5D");

    setAndFlush(controller, 'foo', [3,4]);
    equal(router.get('location.path'), "/?foo=%5B3%2C4%5D");
  });

  test("(de)serialization: arrays", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: [1]
    });

    bootApplication();

    equal(router.get('location.path'), "");

    Ember.run(router, 'transitionTo', { queryParams: { foo: [2,3] } });
    equal(router.get('location.path'), "/?foo=%5B2%2C3%5D", "shorthand supported");
    Ember.run(router, 'transitionTo', { queryParams: { 'index:foo': [4,5] } });
    equal(router.get('location.path'), "/?foo=%5B4%2C5%5D", "longform supported");
    Ember.run(router, 'transitionTo', { queryParams: { foo: [] } });
    equal(router.get('location.path'), "/?foo=%5B%5D", "longform supported");
  });

  test("Url with array query param sets controller property to array", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: ''
    });

    startingURL = "/?foo[]=1&foo[]=2&foo[]=3";
    bootApplication();

    var controller = container.lookup('controller:index');
    deepEqual(controller.get('foo'), ["1","2","3"]);
  });

  test("Array query params can be pushed/popped", function() {
    Router.map(function() {
      this.route("home", { path: '/' });
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: Ember.A([])
    });

    bootApplication();

    equal(router.get('location.path'), "");

    var controller = container.lookup('controller:home');

    Ember.run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), "/?foo=%5B1%5D");
    deepEqual(controller.foo, [1]);
    Ember.run(controller.foo, 'popObject');
    equal(router.get('location.path'), "/");
    deepEqual(controller.foo, []);
    Ember.run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), "/?foo=%5B1%5D");
    deepEqual(controller.foo, [1]);
    Ember.run(controller.foo, 'popObject');
    equal(router.get('location.path'), "/");
    deepEqual(controller.foo, []);
    Ember.run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), "/?foo=%5B1%5D");
    deepEqual(controller.foo, [1]);
    Ember.run(controller.foo, 'pushObject', 2);
    equal(router.get('location.path'), "/?foo=%5B1%2C2%5D");
    deepEqual(controller.foo, [1, 2]);
    Ember.run(controller.foo, 'popObject');
    equal(router.get('location.path'), "/?foo=%5B1%5D");
    deepEqual(controller.foo, [1]);
    Ember.run(controller.foo, 'unshiftObject', 'lol');
    equal(router.get('location.path'), "/?foo=%5B%22lol%22%2C1%5D");
    deepEqual(controller.foo, ['lol', 1]);
  });

  test("Overwriting with array with same content shouldn't refire update", function() {
    expect(3);
    var modelCount = 0;

    Router.map(function() {
      this.route("home", { path: '/' });
    });

    App.HomeRoute = Ember.Route.extend({
      model: function() {
        modelCount++;
      }
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: Ember.A([1])
    });

    bootApplication();

    equal(modelCount, 1);
    var controller = container.lookup('controller:home');
    setAndFlush(controller, 'model', Ember.A([1]));
    equal(modelCount, 1);
    equal(router.get('location.path'), "");
  });

  test("Defaulting to params hash as the model should not result in that params object being watched", function() {
    expect(1);

    Router.map(function() {
      this.route('other');
    });

    // This causes the params hash, which is returned as a route's
    // model if no other model could be resolved given the provided
    // params (and no custom model hook was defined), to be watched,
    // unless we return a copy of the params hash.
    App.ApplicationController = Ember.ObjectController.extend({
      queryParams: ['woot'],
      woot: 'wat'
    });

    App.OtherRoute = Ember.Route.extend({
      model: function(p, trans) {
        var m = Ember.meta(trans.params.application);
        ok(!m.watching.woot, "A meta object isn't constructed for this params POJO");
      }
    });

    bootApplication();

    Ember.run(router, 'transitionTo', 'other');
  });

  test("A child of a resource route still defaults to parent route's model even if the child route has a query param", function() {
    expect(1);

    App.IndexController = Ember.Controller.extend({
      queryParams: ['woot']
    });

    App.ApplicationRoute = Ember.Route.extend({
      model: function(p, trans) {
        return { woot: true };
      }
    });

    App.IndexRoute = Ember.Route.extend({
      setupController: function(controller, model) {
        deepEqual(model, { woot: true }, "index route inherited model route from parent route");
      }
    });

    bootApplication();
  });

  test("opting into replace does not affect transitions between routes", function() {
    expect(5);
    Ember.TEMPLATES.application = Ember.Handlebars.compile(
      "{{link-to 'Foo' 'foo' id='foo-link'}}" +
      "{{link-to 'Bar' 'bar' id='bar-no-qp-link'}}" +
      "{{link-to 'Bar' 'bar' (query-params raytiley='isanerd') id='bar-link'}}" +
      "{{outlet}}"
    );
    App.Router.map(function() {
      this.route('foo');
      this.route('bar');
    });

    App.BarController = Ember.Controller.extend({
      queryParams: ['raytiley'],
      raytiley: 'isadork'
    });

    App.BarRoute = Ember.Route.extend({
      queryParams: {
        raytiley: {
          replace: true
        }
      }
    });

    bootApplication();
    var controller = container.lookup('controller:bar');

    expectedPushURL = '/foo';
    Ember.run(Ember.$('#foo-link'), 'click');

    expectedPushURL = '/bar';
    Ember.run(Ember.$('#bar-no-qp-link'), 'click');

    expectedReplaceURL = '/bar?raytiley=boo';
    setAndFlush(controller, 'raytiley', 'boo');

    expectedPushURL = '/foo';
    Ember.run(Ember.$('#foo-link'), 'click');

    expectedPushURL = '/bar?raytiley=isanerd';
    Ember.run(Ember.$('#bar-link'), 'click');
  });

  test("Undefined isn't deserialized into a string", function() {
    expect(3);
    Router.map(function() {
      this.route("example");
    });

    Ember.TEMPLATES.application = compile("{{link-to 'Example' 'example' id='the-link'}}");

    App.ExampleController = Ember.Controller.extend({
      queryParams: ['foo']
      // uncommon to not support default value, but should assume undefined.
    });

    App.ExampleRoute = Ember.Route.extend({
      model: function(params) {
        deepEqual(params, { foo: undefined });
      }
    });

    bootApplication();

    var $link = Ember.$('#the-link');
    equal($link.attr('href'), "/example");
    Ember.run($link, 'click');

    var controller = container.lookup('controller:example');
    equal(get(controller, 'foo'), undefined);
  });

  QUnit.module("Model Dep Query Params", {
    setup: function() {
      sharedSetup();

      App.Router.map(function() {
        this.resource('article', { path: '/a/:id' }, function() {
          this.resource('comments');
        });
      });

      var articles = this.articles = Ember.A([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

      App.ApplicationController = Ember.Controller.extend({
        articles: this.articles
      });

      var self = this;
      App.ArticleRoute = Ember.Route.extend({
        queryParams: {},
        model: function(params) {
          if (self.expectedModelHookParams) {
            deepEqual(params, self.expectedModelHookParams, "the ArticleRoute model hook received the expected merged dynamic segment + query params hash");
            self.expectedModelHookParams = null;
          }
          return articles.findProperty('id', params.id);
        }
      });

      App.ArticleController = Ember.ObjectController.extend({
        queryParams: ['q', 'z'],
        q: 'wat',
        z: 0
      });

      App.CommentsController = Ember.ArrayController.extend({
        queryParams: 'page',
        page: 1
      });

      Ember.TEMPLATES.application = compile("{{#each a in articles}} {{link-to 'Article' 'article' a id=a.id}} {{/each}} {{outlet}}");

      this.boot = function() {
        bootApplication();

        self.$link1 = Ember.$('#a-1');
        self.$link2 = Ember.$('#a-2');
        self.$link3 = Ember.$('#a-3');

        equal(self.$link1.attr('href'), '/a/a-1');
        equal(self.$link2.attr('href'), '/a/a-2');
        equal(self.$link3.attr('href'), '/a/a-3');

        self.controller = container.lookup('controller:article');
      };
    },

    teardown: function() {
      sharedTeardown();
      ok(!this.expectedModelHookParams, "there should be no pending expectation of expected model hook params");
    }
  });

  test("query params have 'model' stickiness by default", function() {
    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), '/a/a-1');

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');
  });

  test("query params have 'model' stickiness by default (url changes)", function() {

    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'lol', z: 0 };
    handleURL('/a/a-1?q=lol');

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    handleURL('/a/a-2?q=lol');

    deepEqual(this.controller.get('model'), { id: 'a-2' }, "controller's model changed to a-2");
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol'); // fail
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-3', q: 'lol', z: 123 };
    handleURL('/a/a-3?q=lol&z=123');

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 123);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol&z=123');
  });


  test("query params have 'model' stickiness by default (params-based transitions)", function() {
    Ember.TEMPLATES.application = compile("{{#each a in articles}} {{link-to 'Article' 'article' a.id id=a.id}} {{/each}}");

    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'wat', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-1');

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-2', { queryParams: { q: 'lol' } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-3', q: 'hay', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-3', { queryParams: { q: 'hay' } });

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'hay');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=hay');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 1 };
    Ember.run(router, 'transitionTo', 'article', 'a-2', { queryParams: { z: 1 } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 1);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol&z=1');
    equal(this.$link3.attr('href'), '/a/a-3?q=hay');
  });

  test("'controller' stickiness shares QP state between models", function() {
    App.ArticleController.reopen({
      queryParams: { q: { scope: 'controller' } }
    });

    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), '/a/a-1');

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol');

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol');

    this.expectedModelHookParams = { id: 'a-3', q: 'haha', z: 123 };
    handleURL('/a/a-3?q=haha&z=123');

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'haha');
    equal(this.controller.get('z'), 123);

    equal(this.$link1.attr('href'), '/a/a-1?q=haha');
    equal(this.$link2.attr('href'), '/a/a-2?q=haha');
    equal(this.$link3.attr('href'), '/a/a-3?q=haha&z=123');

    setAndFlush(this.controller, 'q', 'woot');

    equal(this.$link1.attr('href'), '/a/a-1?q=woot');
    equal(this.$link2.attr('href'), '/a/a-2?q=woot');
    equal(this.$link3.attr('href'), '/a/a-3?q=woot&z=123');
  });

  test("'model' stickiness is scoped to current or first dynamic parent route", function() {
    this.boot();

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    var commentsCtrl = container.lookup('controller:comments');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-1/comments');

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), '/a/a-1/comments?page=2');

    setAndFlush(commentsCtrl, 'page', 3);
    equal(router.get('location.path'), '/a/a-1/comments?page=3');

    Ember.run(router, 'transitionTo', 'comments', 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-2/comments');

    Ember.run(router, 'transitionTo', 'comments', 'a-1');
    equal(commentsCtrl.get('page'), 3);
    equal(router.get('location.path'), '/a/a-1/comments?page=3');
  });

  test("can reset query params using the resetController hook", function() {
    App.Router.map(function() {
      this.resource('article', { path: '/a/:id' }, function() {
        this.resource('comments');
      });
      this.route('about');
    });

    App.ArticleRoute.reopen({
      resetController: function(controller, isExiting) {
        this.controllerFor('comments').set('page', 1);
        if (isExiting) {
          controller.set('q', 'imdone');
        }
      }
    });

    Ember.TEMPLATES.about = compile("{{link-to 'A' 'comments' 'a-1' id='one'}} {{link-to 'B' 'comments' 'a-2' id='two'}}");

    this.boot();

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    var commentsCtrl = container.lookup('controller:comments');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-1/comments');

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), '/a/a-1/comments?page=2');

    Ember.run(router, 'transitionTo', 'comments', 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(this.controller.get('q'), 'wat');

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    equal(router.get('location.path'), '/a/a-1/comments');
    equal(commentsCtrl.get('page'), 1);

    Ember.run(router, 'transitionTo', 'about');

    equal(Ember.$('#one').attr('href'), "/a/a-1/comments?q=imdone");
    equal(Ember.$('#two').attr('href'), "/a/a-2/comments");
  });


  QUnit.module("Query Params - overlapping query param property names", {
    setup: function() {
      sharedSetup();

      App.Router.map(function() {
        this.resource('parent', function() {
          this.route('child');
        });
      });

      this.boot = function() {
        bootApplication();
        Ember.run(router, 'transitionTo', 'parent.child');
      };
    },

    teardown: function() {
      sharedTeardown();
    }
  });

  test("can remap same-named qp props", function() {
    App.ParentController = Ember.Controller.extend({
      queryParams: { page: 'parentPage' },
      page: 1
    });

    App.ParentChildController = Ember.Controller.extend({
      queryParams: { page: 'childPage' },
      page: 1
    });

    this.boot();

    equal(router.get('location.path'), '/parent/child');

    var parentController = container.lookup('controller:parent');
    var parentChildController = container.lookup('controller:parent.child');

    setAndFlush(parentController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?parentPage=2');
    setAndFlush(parentController, 'page', 1);
    equal(router.get('location.path'), '/parent/child');

    setAndFlush(parentChildController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?childPage=2');
    setAndFlush(parentChildController, 'page', 1);
    equal(router.get('location.path'), '/parent/child');

    Ember.run(function() {
      parentController.set('page', 2);
      parentChildController.set('page', 2);
    });

    equal(router.get('location.path'), '/parent/child?childPage=2&parentPage=2');

    Ember.run(function() {
      parentController.set('page', 1);
      parentChildController.set('page', 1);
    });

    equal(router.get('location.path'), '/parent/child');
  });

  test("query params in the same route hierarchy with the same url key get auto-scoped", function() {
    App.ParentController = Ember.Controller.extend({
      queryParams: { foo: 'shared' },
      foo: 1
    });

    App.ParentChildController = Ember.Controller.extend({
      queryParams: { bar: 'shared' },
      bar: 1
    });

    var self = this;
    expectAssertion(function() {
      self.boot();
    }, "You're not allowed to have more than one controller property map to the same query param key, but both `parent:foo` and `parent.child:bar` map to `shared`. You can fix this by mapping one of the controller properties to a different query param key via the `as` config option, e.g. `foo: { as: 'other-foo' }`");
  });

  test("Support shared but overridable mixin pattern", function() {

    var HasPage = Ember.Mixin.create({
      queryParams: 'page',
      page: 1
    });

    App.ParentController = Ember.Controller.extend(HasPage, {
      queryParams: { page: 'yespage' },
    });

    App.ParentChildController = Ember.Controller.extend(HasPage);

    this.boot();

    equal(router.get('location.path'), '/parent/child');

    var parentController = container.lookup('controller:parent');
    var parentChildController = container.lookup('controller:parent.child');

    setAndFlush(parentChildController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?page=2');
    equal(parentController.get('page'), 1);
    equal(parentChildController.get('page'), 2);

    setAndFlush(parentController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?page=2&yespage=2');
    equal(parentController.get('page'), 2);
    equal(parentChildController.get('page'), 2);
  });

}


