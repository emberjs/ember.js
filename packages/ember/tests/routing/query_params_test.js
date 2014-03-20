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

    Ember.run(controller, 'set', 'foo', '456');

    equal(router.get('location.path'), "/?foo=456");

    Ember.run(controller, 'set', 'foo', '987');
    equal(router.get('location.path'), "/?foo=987");
  });

  test("Query params can map to different url keys with colon syntax.", function() {
    App.IndexController = Ember.Controller.extend({
      queryParams: ['foo:other_key'],
      foo: "FOO"
    });

    bootApplication();
    equal(router.get('location.path'), "");

    var controller = container.lookup('controller:index');
    Ember.run(controller, 'set', 'foo', 'LEX');

    equal(router.get('location.path'), "/?other_key=LEX");
    Ember.run(controller, 'set', 'foo', 'WOO');
    equal(router.get('location.path'), "/?other_key=WOO");

    Ember.run(router, 'transitionTo', '/?other_key=NAW');
    equal(controller.get('foo'), "NAW");
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
    Ember.run(controller, 'set', 'foo', '456');
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
    Ember.run(indexController, 'set', 'omg', 'lex');

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
    Ember.run(appController, 'set', 'alex', 'wallace');
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
    Ember.run(controller, 'set', 'foo', '');
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

    Ember.run(controller, 'set', 'foo', [1,2]);

    equal(router.get('location.path'), "/?foo=%5B1%2C2%5D");

    Ember.run(controller, 'set', 'foo', [3,4]);
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
    Ember.run(controller.foo, 'pushObject', 2);
    equal(router.get('location.path'), "/?foo=%5B1%2C2%5D");
    Ember.run(controller.foo, 'popObject');
    equal(router.get('location.path'), "/?foo=%5B1%5D");
    Ember.run(controller.foo, 'unshiftObject', 'lol');
    equal(router.get('location.path'), "/?foo=%5B%22lol%22%2C1%5D");
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
    Ember.run(controller, 'set', Ember.A([1]));
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
