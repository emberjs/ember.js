var get = Ember.get, set = Ember.set;

var application;
var Application;

Application = Ember.Application.extend({
  name: "App",
  rootElement: "#qunit-fixture"
});

module("Ember.Application - resetting", {
  teardown: function() {
    if (application) {
      Ember.run(function() {
        application.destroy();
      });
    }
  }
});

test("When an application is reset, new instances of controllers are generated", function() {
  Ember.run(function() {
    application = Application.create();
    application.AcademicController = Ember.Controller.extend();
    application.initialize();
  });

  var firstController = application.__container__.lookup('controller:academic');
  var secondController = application.__container__.lookup('controller:academic');

  Ember.run(function() {
    application.reset();
  });

  var thirdController = application.__container__.lookup('controller:academic');

  strictEqual(firstController, secondController, "controllers looked up in succession should be the same instance");

  ok(firstController.isDestroying, 'controllers are destroyed when their application is reset');

  notStrictEqual(firstController, thirdController, "controllers looked up after the application is reset should not be the same instance");
});

test("When an application is reset, the ApplicationView is torn down", function() {
  Ember.run(function() {
    application = Application.create();
    application.ApplicationView = Ember.View.extend({
      elementId: "application-view"
    });
    application.initialize();
  });

  equal(Ember.$('#qunit-fixture #application-view').length, 1, "precond - the application view is rendered");

  var originalView = Ember.View.views['application-view'];

  Ember.run(function() {
    application.reset();
  });

  var resettedView = Ember.View.views['application-view'];

  equal(Ember.$('#qunit-fixture #application-view').length, 1, "the application view is rendered");

  notStrictEqual(originalView, resettedView, "The view object has changed");
});

test("When an application is reset, the router URL is reset to `/`", function() {
  var location, router;

  Ember.run(function() {
    application = Application.create();
    application.Router = Ember.Router.extend({
      location: 'none'
    });

    application.Router.map(function() {
      this.route('one');
      this.route('two');
    });

    application.initialize();
  });

  router = application.__container__.lookup('router:main');

  location = router.get('location');
  location.handleURL('/one');

  Ember.run(function() {
    application.reset();
  });

  var applicationController = application.__container__.lookup('controller:application');
  router = application.__container__.lookup('router:main');
  location = router.get('location');

  equal(location.getURL(), '');

  equal(get(applicationController, 'currentPath'), "index");

  location = application.__container__.lookup('router:main').get('location');
  location.handleURL('/one');

  equal(get(applicationController, 'currentPath'), "one");
});
