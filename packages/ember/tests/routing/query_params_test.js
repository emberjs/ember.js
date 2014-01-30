var Router, App, AppView, templates, router, container;
var get = Ember.get,
    set = Ember.set,
    compile = Ember.Handlebars.compile,
    forEach = Ember.EnumerableUtils.forEach;

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

var TestLocation = Ember.NoneLocation.extend({
  initState: function() {
    this.set('path', startingURL);
  },

  setURL: function(path) {
    if (expectedPushURL) {
      equal(path, expectedPushURL, "an expected pushState occurred");
      expectedPushURL = null;
    }
    this.set('path', path);
  },

  replaceURL: function(path) {
    if (expectedReplaceURL) {
      equal(path, expectedReplaceURL, "an expected replaceState occurred");
      expectedReplaceURL = null;
    }
    this.set('path', path);
  }
});

if (Ember.FEATURES.isEnabled("query-params-new")) {

  module("Routing w/ Query Params", {
    setup: function() {
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
    },

    teardown: function() {
      Ember.run(function() {
        App.destroy();
        App = null;

        Ember.TEMPLATES = {};
      });
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

    Ember.run(controller, '_activateQueryParamObservers');
    Ember.run(controller, 'set', 'foo', '456');

    equal(router.get('location.path'), "/?foo=456");

    Ember.run(controller, 'set', 'foo', '987');
    equal(router.get('location.path'), "/?foo=987");
  });

  test("A replaceURL occurs on startup if QP values aren't already in sync", function() {
    expect(1);

    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123"
    });

    expectedReplaceURL = "/?foo=123";

    bootApplication();
  });

  test('can fetch all the query param mappings associated with a route via controller `queryParams`', function() {
    Router.map(function() {
      this.route("home");
      this.route("parmesan");
      this.route("nothin");
      this.resource("horrible", function() {
        this.route("smell");
        this.route("beef");
        this.resource("cesspool", function() {
          this.route("stankonia");
        });
      });
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "1"
    });

    App.ParmesanController = Ember.Controller.extend({
      queryParams: ['bar'],
      bar: "borf"
    });

    App.HorribleController = Ember.Controller.extend({
      queryParams: ['yes'],
      yes: "no"
    });

    App.HorribleIndexController = Ember.Controller.extend({
      queryParams: ['nerd', 'dork'],
      nerd: "bubbles",
      dork: "troubles"
    });

    App.HorribleSmellController = Ember.Controller.extend({
      queryParams: ['lion'],
      lion: "king"
    });

    bootApplication();

    deepEqual(router._queryParamNamesFor('home'), { queryParams: { 'home:foo': 'foo' }, translations: { foo: 'home:foo' }, validQueryParams: {foo: true} });
    deepEqual(router._queryParamNamesFor('parmesan'), { queryParams: { 'parmesan:bar': 'bar' }, translations: { 'bar': 'parmesan:bar'}, validQueryParams: {bar: true} });
    deepEqual(router._queryParamNamesFor('nothin'), { queryParams: {}, translations: {}, validQueryParams: {} });
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

    equal(router.get('location.path'), "/?omg=lol");
  });

  test("controllers won't be eagerly instantiated by internal query params logic", function() {
    expect(6);
    Router.map(function() {
      this.route("home", { path: '/' });
      this.route("about");
    });

    Ember.TEMPLATES.home = compile("<h3>{{link-to 'About' 'about' (query-params lol='wat') id='link-to-about'}}</h3>");
    Ember.TEMPLATES.about = compile("<h3>{{link-to 'Home' 'home'  (query-params foo='naw')}}</h3>");

    var homeShouldBeCreated = false,
        aboutShouldBeCreated = false;

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

    bootApplication();

    equal(router.get('location.path'), "/?foo=123", 'url is correct');
    var controller = container.lookup('controller:home');
    Ember.run(controller, 'set', 'foo', '456');
    equal(router.get('location.path'), "/?foo=456", 'url is correct');
    equal(Ember.$('#link-to-about').attr('href'), "/about?lol=wat", "link to about is correct");
    Ember.run(router, 'transitionTo', 'about');

    equal(router.get('location.path'), "/about?lol=haha", 'url is correct');
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

    equal(router.get('location.path'), "/?appomg=applol&omg=lol");
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

    startingURL = "/?omg=yes&appomg=appyes";
    bootApplication();

    equal(router.get('location.path'), "/?appomg=appyes&omg=yes");
  });

  test("can opt into full transition in response to QP change by calling refresh() inside queryParamsDidChange action", function() {
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
      model: function(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          deepEqual(params, { omg: 'lex' });
        }
      },
      actions: {
        queryParamsDidChange: function() {
          this.refresh();
        }
      }
    });

    bootApplication();

    equal(appModelCount, 1);
    equal(indexModelCount, 1);

    var indexController = container.lookup('controller:index');
    Ember.run(indexController, 'set', 'omg', 'lex');

    equal(appModelCount, 1);
    equal(indexModelCount, 2);
  });

  test("can override incoming QP values in setupController", function() {
    expect(2);

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

    startingURL = "/?omg=borf";
    bootApplication();
    equal(router.get('location.path'), "/?omg=OVERRIDE");
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
    equal(Ember.$('#two').attr('href'), "/abcdef/zoo?foo=123&bar=456");

    Ember.run(Ember.$('#one'), 'click');
    equal(router.get('location.path'), "/abcdef?foo=123");
    Ember.run(Ember.$('#two'), 'click');
    equal(router.get('location.path'), "/abcdef/zoo?foo=123&bar=456");
  });

  test("transitionTo supports query params", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'lol'
    });

    bootApplication();

    equal(router.get('location.path'), "/?foo=lol");

    Ember.run(router, 'transitionTo', { queryParams: { foo: "borf" } });
    equal(router.get('location.path'), "/?foo=borf", "shorthand supported");
    Ember.run(router, 'transitionTo', { queryParams: { 'index:foo': "blaf" } });
    equal(router.get('location.path'), "/?foo=blaf", "longform supported");
    Ember.run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), "/", "longform supported");
  });

  test("setting controller QP to empty string doesn't generate null in URL", function() {
    expect(1);
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123"
    });

    bootApplication();
    var controller = container.lookup('controller:index');

    expectedReplaceURL = "/?foo=";
    Ember.run(controller, 'set', 'foo', '');
  });

  test("transitioning to empty string QP doesn't generate null in URL", function() {
    expect(1);
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123"
    });

    bootApplication();
    var controller = container.lookup('controller:index');

    expectedReplaceURL = "/?foo=";
    Ember.run(router, 'transitionTo', { queryParams: { foo: '' } });
  });

  test("Query param without =value are boolean", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: false
    });

    startingURL = "/?foo";
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), true);
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

    Ember.run(controller, '_activateQueryParamObservers');
    Ember.run(controller, 'set', 'foo', [1,2]);

    equal(router.get('location.path'), "/?foo[]=1&foo[]=2");

    Ember.run(controller, 'set', 'foo', [3,4]);
    equal(router.get('location.path'), "/?foo[]=3&foo[]=4");
  });

  test("transitionTo supports array query params", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: [1]
    });

    bootApplication();

    equal(router.get('location.path'), "/?foo[]=1");

    Ember.run(router, 'transitionTo', { queryParams: { foo: [2,3] } });
    equal(router.get('location.path'), "/?foo[]=2&foo[]=3", "shorthand supported");
    Ember.run(router, 'transitionTo', { queryParams: { 'index:foo': [4,5] } });
    equal(router.get('location.path'), "/?foo[]=4&foo[]=5", "longform supported");
    Ember.run(router, 'transitionTo', { queryParams: { foo: [] } });
    equal(router.get('location.path'), "/", "longform supported");
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

    var controller = container.lookup('controller:home');

    Ember.run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), "/?foo[]=1");
    Ember.run(controller.foo, 'pushObject', 2);
    equal(router.get('location.path'), "/?foo[]=1&foo[]=2");
    Ember.run(controller.foo, 'popObject');
    equal(router.get('location.path'), "/?foo[]=1");
    Ember.run(controller.foo, 'unshiftObject', 'lol');
    equal(router.get('location.path'), "/?foo[]=lol&foo[]=1");
  });

  test("Can swap out qp props as strings, arrays, back and forth", function() {
    Router.map(function() {
      this.route("home", { path: '/' });
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: Ember.A([])
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    Ember.run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), "/?foo[]=1");
    Ember.run(controller, 'set', 'foo', Ember.A(['lol']));
    equal(router.get('location.path'), "/?foo[]=lol");
    Ember.run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), "/?foo[]=lol&foo[]=1");
    Ember.run(controller, 'set', 'foo', 'hello');
    equal(router.get('location.path'), "/?foo=hello");
    Ember.run(controller, 'set', 'foo', true);
    equal(router.get('location.path'), "/?foo");
  });

  test("Overwriting with array with same content shouldn't refire update", function() {
    expect(1);
    Router.map(function() {
      this.route("home", { path: '/' });
    });

    App.HomeRoute = Ember.Route.extend({
      actions: {
        queryParamsDidChange: function() {
          ok(false, "queryParamsDidChange shouldn't have been called");
        }
      }
    });

    App.HomeController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: Ember.A([1])
    });

    bootApplication();

    var controller = container.lookup('controller:home');
    Ember.run(controller, 'set', Ember.A([1]));
    equal(router.get('location.path'), "/?foo[]=1");
  });

  test("Conflicting query params are scoped", function() {

    Router.map(function() {
      this.resource('root', function() {
        this.resource('leaf');
      });
    });

    Ember.TEMPLATES.application = compile("{{link-to 'Leaf' 'leaf' (query-params root:foo='123' leaf:foo='abc') id='leaf-link'}} " +
                                          "{{link-to 'Root' 'root' (query-params foo='bar') id='root-link'}} " +
                                          "{{outlet}}");

    App.RootController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });

    App.LeafController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'abc'
    });

    bootApplication();
    var rootController = container.lookup('controller:root'),
        leafController = container.lookup('controller:leaf');


    equal(router.get('location.path'), "");
    equal(Ember.$('#leaf-link').attr('href'), "/root/leaf?root[foo]=123&leaf[foo]=abc");
    equal(Ember.$('#root-link').attr('href'), "/root?foo=bar");

    Ember.run(Ember.$('#root-link'), 'click');
    equal(rootController.get('foo'), 'bar');

    Ember.run(Ember.$('#leaf-link'), 'click');
    equal(rootController.get('foo'), '123');
    equal(leafController.get('foo'), 'abc');

    Ember.run(rootController, 'set', 'foo', '456');
    equal(router.get('location.path'), "/root/leaf?root[foo]=456&leaf[foo]=abc");

    Ember.run(leafController, 'set', 'foo', 'def');
    equal(router.get('location.path'), "/root/leaf?root[foo]=456&leaf[foo]=def");


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
      queryParams: ['woot']
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
}
