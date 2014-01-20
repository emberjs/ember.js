var Router, App, AppView, templates, router, container, originalTemplates;
var get = Ember.get, set = Ember.set;

function bootApplication(url) {
  router = container.lookup('router:main');
  if(url) { router.location.setURL(url); }
  Ember.run(App, 'advanceReadiness');
}

function compile(string) {
  return Ember.Handlebars.compile(string);
}

function transitionTo() {
  var args = arguments;
  Ember.run(function() {
    router.transitionTo.apply(router, args).then(null, function() {
      ok(false, "TRANSITION FAILED");
    });
  });
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

function shouldNotHappen(error) {
  console.error(error.stack);
  ok(false, "this .then handler should not be called: " + error.message);
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
if (Ember.FEATURES.isEnabled("ember-document-title")) {

  var originalWarn = Ember.warn;
  module("Routing document.title integration", {
    setup: function() {
      Ember.run(function() {
        App = Ember.Application.create({
          name: "App",
          rootElement: '#qunit-fixture'
        });

        App.deferReadiness();

        App.Router.reopen({
          location: 'none',
          titleDivider: ' | ',
          titleSpecificityIncreases: false
        });

        Router = App.Router;

        App.LoadingRoute = Ember.Route.extend();

        container = App.__container__;

        originalTemplates = Ember.$.extend({}, Ember.TEMPLATES);
        Ember.TEMPLATES.application = compile("{{outlet}}");
        Ember.TEMPLATES.ministries = compile("<h3>Ministries</h3>");
        Ember.TEMPLATES.ministry = compile("<h3>{{name}}</h3>");
        Ember.TEMPLATES.employee = compile("<h3>{{name}}</h3>");
      });
    },

    teardown: function() {
      Ember.warn = originalWarn;
      Ember.run(function() {
        App.destroy();
        App = null;

        Ember.TEMPLATES = originalTemplates;
      });
    }
  });

  test("The document.title is updated upon booting the app", function() {
    expect(1);

    Router.map(function() {
      this.route("index", { path: "/" });
    });

    App.IndexRoute = Ember.Route.extend({
      title: "British Government"
    });

    bootApplication("/");
    equal(router._docTitle, "British Government");
  });


  test("Transitioning will update the title of the document", function() {
    expect(7);

    Router.map(function() {
      this.route("ministries", { path: "/ministries" });
      this.resource("ministry", { path: "/ministries/:ministry_id" });
      this.resource("employee", { path: "/employee/:employee_id" });
    });

    App.MinistriesRoute = Ember.Route.extend({
      title: "Ministries"
    });

    App.MinistryRoute = Ember.Route.extend({
      title: Ember.computed.oneWay("controller.name")
    });

    App.EmployeeRoute = Ember.Route.extend({
      title: Ember.computed("controller.id", function () {
        return "Employee #" + get(this, "controller.id");
      })
    });

    bootApplication();

    var ministry = Ember.Object.create({
      name: "Ministry of Silly Walks"
    });

    ok(!router._docTitle);
    transitionTo('ministries');
    equal(router._docTitle, "Ministries");
    transitionTo('ministry', ministry);
    equal(router._docTitle, "Ministry of Silly Walks");
    Ember.run(ministry, 'set', 'name', "Ministry of Pointless Arguments");
    equal(router._docTitle, "Ministry of Pointless Arguments");
    transitionTo('ministries');
    equal(router._docTitle, "Ministries");
    Ember.run(ministry, 'set', 'name', "Ministry of Silly Walks");
    equal(router._docTitle, "Ministries");

    transitionTo("employee", Ember.Object.create({
      id: 5,
      name: "Mr. Teabag"
    }));

    equal(router._docTitle, "Employee #5");
  });

  test("Deeper nesting", function() {
    expect(11);

    Router.map(function() {
      this.resource("ministry", { path: "/ministry/:ministry_id" }, function() {
        this.route('lameness');
      });
      this.route('outside');
      this.route('override');
    });

    var titleCount = 0;
    App.ApplicationRoute = Ember.Route.extend({
      title: Ember.computed(function() {
        ++titleCount;
        return this.get('titleTokens').reverse().join(' | ');
      }),

      titleToken: "British Government"
    });

    App.MinistryIndexRoute = Ember.Route.extend({
      titleToken: "Welcome"
    });

    App.MinistryLamenessRoute = Ember.Route.extend({
      titleToken: "Lameskies"
    });

    App.MinistryRoute = Ember.Route.extend({
      titleToken: Ember.computed.oneWay("controller.name")
    });

    App.OutsideRoute = Ember.Route.extend({
      titleToken: 'Outside'
    });

    App.OverrideRoute = Ember.Route.extend({
      title: Ember.computed(function() {
        titleCount++;
        return 'WHAT NOW APPLICATIONROUTE';
      })
    });

    function assertCount(count) {
      equal(count, titleCount, "title hasn't been over-computed");
    }

    bootApplication();
    assertCount(1);

    var ministry = Ember.Object.create({
      name: "Ministry of Silly Walks"
    });

    transitionTo('ministry', ministry);
    assertCount(2);

    equal(router._docTitle, "Welcome | Ministry of Silly Walks | British Government");

    transitionTo('ministry.lameness');
    assertCount(3);
    equal(router._docTitle, "Lameskies | Ministry of Silly Walks | British Government");

    Ember.run(ministry, 'set', 'name', "Ministry of Matchneerian Ineptitude");
    assertCount(4);
    equal(router._docTitle, "Lameskies | Ministry of Matchneerian Ineptitude | British Government");

    Ember.run(function() {
      router.transitionTo('outside');
      ministry.set('name', 'OMG');
    });

    assertCount(5);
    equal(router._docTitle, "Outside | British Government");

    transitionTo('override');
    assertCount(6);
    equal(router._docTitle, 'WHAT NOW APPLICATIONROUTE');
  });

  test("titleToken can be an array of multiple tokens", function() {
    expect(1);

    App.ApplicationRoute = Ember.Route.extend({
      title: Ember.computed(function() {
        return this.get('titleTokens').join(' - ');
      }),
      titleToken: ["APP", "LOL"]
    });

    App.IndexRoute = Ember.Route.extend({
      titleToken: Ember.computed(function() {
        return ["INDEX", "WOOT"];
      })
    });

    bootApplication();
    equal(router._docTitle, "APP - LOL - INDEX - WOOT");
  });

  test("Defining titleTokens but no title on parent route yields default title and warns user", function() {

    expect(2);

    Ember.warn = function(msg) {
      equal(msg, "You specified a `titleToken` on at least one route but did not specify a `title` property on the 'application' route. A default document.title has been generated for you, but you'll probably want to provide your own implementation of a `title` computed property on the 'application' route that constructs a custom title using the collected title tokens in `this.get('titleTokens')`");
    };

    App.ApplicationRoute = Ember.Route.extend({
      titleToken: 'app'
    });

    App.IndexRoute = Ember.Route.extend({
      titleToken: 'index'
    });

    bootApplication();

    equal(router._docTitle, "app | index");
  });
}

