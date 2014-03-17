var get = Ember.get, set = Ember.set;

var application;
var Application;

module("Ember.Application - resetting", {
  setup: function() {
    Application = Ember.Application.extend({
      name: "App",
      rootElement: "#qunit-fixture"
    });
  },
  teardown: function() {
    Application = null;
    if (application) {
      Ember.run(application, 'destroy');
    }
  }
});

test("Brings it's own run-loop if not provided", function() {
  application = Ember.run(Application, 'create');

  application.reset();

  Ember.run(application,'then', function() {
    ok(true, 'app booted');
  });
});

test("does not bring it's own run loop if one is already provided", function() {
  expect(3);

  var didBecomeReady = false;

  application = Ember.run(Application, 'create');

  Ember.run(function() {

    application.ready = function() {
      didBecomeReady = true;
    };

    application.reset();

    application.deferReadiness();
    ok(!didBecomeReady, 'app is not ready');
  });

  ok(!didBecomeReady, 'app is not ready');
  Ember.run(application, 'advanceReadiness');
  ok(didBecomeReady, 'app is ready');
});

test("When an application is reset, new instances of controllers are generated", function() {
  Ember.run(function() {
    application = Application.create();
    application.AcademicController = Ember.Controller.extend();
  });

  var firstController = application.__container__.lookup('controller:academic');
  var secondController = application.__container__.lookup('controller:academic');

  application.reset();

  var thirdController = application.__container__.lookup('controller:academic');

  strictEqual(firstController, secondController, "controllers looked up in succession should be the same instance");

  ok(firstController.isDestroying, 'controllers are destroyed when their application is reset');

  notStrictEqual(firstController, thirdController, "controllers looked up after the application is reset should not be the same instance");
});

test("When an application is reset, the eventDispatcher is destroyed and recreated", function() {
  var eventDispatcherWasSetup, eventDispatcherWasDestroyed,
  stubEventDispatcher;

  eventDispatcherWasSetup = 0;
  eventDispatcherWasDestroyed = 0;

  var originalDispatcher = Ember.EventDispatcher;

  stubEventDispatcher = {
    setup: function() {
      eventDispatcherWasSetup++;
    },
    destroy: function() {
      eventDispatcherWasDestroyed++;
    }
  };

  Ember.EventDispatcher = {
    create: function() {
      return stubEventDispatcher;
    }
  };

  try {
    Ember.run(function() {
      application = Application.create();

      equal(eventDispatcherWasSetup, 0);
      equal(eventDispatcherWasDestroyed, 0);
    });

    equal(eventDispatcherWasSetup, 1);
    equal(eventDispatcherWasDestroyed, 0);

    application.reset();

    equal(eventDispatcherWasSetup, 2);
    equal(eventDispatcherWasDestroyed, 1);
  } catch (error) { }

  Ember.EventDispatcher = originalDispatcher;
});

test("When an application is reset, the ApplicationView is torn down", function() {
  Ember.run(function() {
    application = Application.create();
    application.ApplicationView = Ember.View.extend({
      elementId: "application-view"
    });
  });

  equal(Ember.$('#qunit-fixture #application-view').length, 1, "precond - the application view is rendered");

  var originalView = Ember.View.views['application-view'];

  application.reset();

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
  });

  router = application.__container__.lookup('router:main');

  location = router.get('location');

  Ember.run(function() {
    location.handleURL('/one');
  });

  application.reset();

  var applicationController = application.__container__.lookup('controller:application');
  router = application.__container__.lookup('router:main');
  location = router.get('location');

  equal(location.getURL(), '');

  equal(get(applicationController, 'currentPath'), "index");

  location = application.__container__.lookup('router:main').get('location');
  Ember.run(function() {
    location.handleURL('/one');
  });

  equal(get(applicationController, 'currentPath'), "one");
});

test("When an application with advance/deferReadiness is reset, the app does correctly become ready after reset", function() {
  var location, router, readyCallCount;

  readyCallCount = 0;

  Ember.run(function() {
    application = Application.create({
      ready: function() {
        readyCallCount++;
      }
    });

    application.deferReadiness();
    equal(readyCallCount, 0, 'ready has not yet been called');
  });

  Ember.run(function() {
    application.advanceReadiness();
  });

  equal(readyCallCount, 1, 'ready was called once');

  application.reset();

  equal(readyCallCount, 2, 'ready was called twice');
});

test("With ember-data like initializer and constant", function() {
  var location, router, readyCallCount;

  readyCallCount = 0;

  var DS = {
    Store: Ember.Object.extend({
      init: function() {
         if (!get(DS, 'defaultStore')) {
          set(DS, 'defaultStore', this);
         }

         this._super();
      },
      willDestroy: function() {
        if (get(DS, 'defaultStore') === this) {
          set(DS, 'defaultStore', null);
        }
      }
    })
  };

  Application.initializer({
    name: "store",
    initialize: function(container, application) {
      application.register('store:main', application.Store);

      container.lookup('store:main');
    }
  });

  Ember.run(function() {
    application = Application.create();
    application.Store = DS.Store;
  });

  ok(DS.defaultStore, 'has defaultStore');

  application.reset();

  ok(DS.defaultStore, 'still has defaultStore');
  ok(application.__container__.lookup("store:main"), 'store is still present');
});

test("Ensure that the hashchange event listener is removed", function(){
  var listeners;

  Ember.$(window).off('hashchange'); // ensure that any previous listeners are cleared

  Ember.run(function() {
    application = Application.create();
  });

  listeners = Ember.$._data(Ember.$(window)[0], 'events');
  equal(listeners['hashchange'].length, 1, 'hashchange event listener was setup');

  application.reset();

  listeners = Ember.$._data(Ember.$(window)[0], 'events');
  equal(listeners['hashchange'].length, 1, 'hashchange event only exists once');
});
