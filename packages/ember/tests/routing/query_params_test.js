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
        Ember.TEMPLATES.homepage = compile("<h3>Megatroll</h3><p>{{home}}</p>");
        Ember.TEMPLATES.camelot = compile('<section><h3>Is a silly place</h3></section>');
      });
    },

    teardown: function() {
      Ember.run(function() {
        App.destroy();
        App = null;

        Ember.TEMPLATES = {};
      });
      Ember.TESTING_DEPRECATION = false;
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

    equal(router.get('location.path'), "/?home[foo]=456");

    Ember.run(controller, 'set', 'foo', '987');
    equal(router.get('location.path'), "/?home[foo]=987");
  });

  test("A replaceURL occurs on startup if QP values aren't already in sync", function() {
    expect(1);

    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: "123"
    });

    expectedReplaceURL = "/?index[foo]=123";

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

    deepEqual(router._queryParamNamesFor('home'), { queryParams: { 'home:foo': 'home[foo]' }, translations: { foo: 'home:foo' } });
    deepEqual(router._queryParamNamesFor('parmesan'), { queryParams: { 'parmesan:bar': 'parmesan[bar]' }, translations: { 'bar': 'parmesan:bar'} });
    deepEqual(router._queryParamNamesFor('nothin'), { queryParams: {}, translations: {} });
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

    equal(router.get('location.path'), "/?index[omg]=lol");
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

    startingURL = "/?index[omg]=yes";
    bootApplication();

    equal(router.get('location.path'), "/?index[omg]=yes");
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

    equal(router.get('location.path'), "/?index[omg]=lol&appomg=applol");
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

    startingURL = "/?index[omg]=yes&appomg=appyes";
    bootApplication();

    equal(router.get('location.path'), "/?index[omg]=yes&appomg=appyes");
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

    startingURL = "/?index[omg]=borf";
    bootApplication();
    equal(router.get('location.path'), "/?index[omg]=OVERRIDE");
  });
}
