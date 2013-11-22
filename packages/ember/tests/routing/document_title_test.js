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
    equal(document.title, "British Government");
  });


  asyncTest("Transitioning will update the title of the document", function() {
    expect(8);

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

    var originalTitle = document.title;
    bootApplication();

    var transition = handleURL('/'),
        ministry = Ember.Object.create({
          name: "Ministry of Silly Walks"
        });

    Ember.run(function () {
      transition.then(function () {
        equal(document.title, originalTitle);
        return router.transitionTo('ministries');
      }, shouldNotHappen).then(function(result) {
        equal(document.title, "Ministries");

        return router.transitionTo('ministry', ministry);
      }, shouldNotHappen).then(function (result) {
        equal(document.title, "Ministry of Silly Walks");

        set(ministry, 'name', "Ministry of Pointless Arguments");
        equal(document.title, "Ministry of Pointless Arguments");

        return router.transitionTo('ministries');
      }, shouldNotHappen).then(function (result) {
        equal(document.title, "Ministries");

        set(ministry, 'name', "Ministry of Silly Walks");

        return new Ember.RSVP.Promise(function (resolve) {
          Ember.run.next(resolve);
        });
      }).then(function () {
        equal(document.title, "Ministries");

        return router.transitionTo("employee", Ember.Object.create({
          id: 5,
          name: "Mr. Teabag"
        }));
      }, shouldNotHappen).then(function (result) {
        equal(document.title, "Employee #5");

        start();
      }, shouldNotHappen);
    });
  });


  asyncTest("specifying the titleDivider property", function() {
    expect(3);

    Router.map(function() {
      this.resource("ministry", { path: "/ministry/:ministry_id" });
    });

    App.ApplicationRoute = Ember.Route.extend({
      title: "British Government"
    });

    App.MinistryRoute = Ember.Route.extend({
      title: Ember.computed.oneWay("controller.name")
    });

    bootApplication();

    var transition = handleURL('/'),
        ministry = Ember.Object.create({
          name: "Ministry of Silly Walks"
        });

    Ember.run(function() {
      transition.then(function() {
        return router.transitionTo('ministry', ministry);
      }, shouldNotHappen).then(function(result) {
        equal(document.title, "Ministry of Silly Walks | British Government");

        set(router, 'titleDivider', ': ');
        Ember.run.next(function () {
          equal(document.title, "Ministry of Silly Walks: British Government");
          start();
        });
      }, shouldNotHappen);
    });
  });

  asyncTest("specifying the titleSpecificityIncreases property", function() {
    expect(3);

    Router.map(function() {
      this.resource("ministry", { path: "/ministry/:ministry_id" });
    });

    App.ApplicationRoute = Ember.Route.extend({
      title: "British Government"
    });

    App.MinistryRoute = Ember.Route.extend({
      title: Ember.computed.oneWay("controller.name")
    });

    bootApplication();

    var transition = handleURL('/'),
        ministry = Ember.Object.create({
          name: "Ministry of Silly Walks"
        });

    Ember.run(function() {
      transition.then(function() {
        return router.transitionTo('ministry', ministry);
      }, shouldNotHappen).then(function(result) {
        equal(document.title, "Ministry of Silly Walks | British Government");

        set(router, 'titleSpecificityIncreases', true);
        Ember.run.next(function () {
          equal(document.title, "British Government | Ministry of Silly Walks");
          start();
        });
      }, shouldNotHappen);
    });
  });
}
