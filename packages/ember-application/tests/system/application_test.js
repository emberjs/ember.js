// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view;
var application;
var set = Ember.set, get = Ember.get;

module("Ember.Application", {
  setup: function() {
    Ember.$("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    Ember.run(function() {
      application = Ember.Application.create({ rootElement: '#one' });
      application.initialize();
    });
  },

  teardown: function() {
    if (application) {
      Ember.run(function(){ application.destroy(); });
    }
  }
});

test("you can make a new application in a non-overlapping element", function() {
  var app;
  Ember.run(function() {
    app = Ember.Application.create({ rootElement: '#two' });
  });
  Ember.run(function() {
    app.destroy();
  });
  ok(true, "should not raise");
});

test("you cannot make a new application that is a parent of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#qunit-fixture' }).initialize();
    });
  }, Error);
});

test("you cannot make a new application that is a descendent of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one-child' }).initialize();
    });
  }, Error);
});

test("you cannot make a new application that is a duplicate of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one' }).initialize();
    });
  }, Error);
});

test("you cannot make two default applications without a rootElement error", function() {
  // Teardown existing
  Ember.run(function() {
    application.destroy();
  });

  Ember.run(function() {
    application = Ember.Application.create().initialize();
  });
  raises(function() {
    Ember.run(function() {
      Ember.Application.create().initialize();
    });
  }, Error);
});

test("acts like a namespace", function() {
  var app;
  Ember.run(function() {
    app = window.TestApp = Ember.Application.create({rootElement: '#two'});
  });
  app.Foo = Ember.Object.extend();
  equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
  Ember.run(function() {
    app.destroy();
  });
  window.TestApp = undefined;
});

var app;

module("Ember.Application initialization", {
  teardown: function() {
    Ember.run(function(){ app.destroy(); });
  }
});

test("initialize controllers into a state manager", function() {
  Ember.run(function() {
    app = Ember.Application.create();
  });

  app.FooController = Ember.Object.extend();
  app.BarController = Ember.ArrayController.extend();
  app.Foo = Ember.Object.create();
  app.fooController = Ember.Object.create();

  var stateManager = Ember.Object.create();

  Ember.run(function() { app.initialize(stateManager); });

  ok(get(stateManager, 'fooController') instanceof app.FooController, "fooController was assigned");
  ok(get(stateManager, 'barController') instanceof app.BarController, "barController was assigned");
  ok(get(stateManager, 'foo') === undefined, "foo was not assigned");

  equal(get(stateManager, 'fooController.target'), stateManager, "the state manager is assigned");
  equal(get(stateManager, 'barController.target'), stateManager, "the state manager is assigned");
  equal(get(stateManager, 'fooController.namespace'), app, "the namespace is assigned");
  equal(get(stateManager, 'fooController.namespace'), app, "the namespace is assigned");
});

test('initialized application go to initial route', function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.stateManager = Ember.Router.create({
      location: {
        getURL: function() {
          return '/';
        },
        setURL: function() {},
        onUpdateURL: function() {}
      },

      root: Ember.Route.extend({
        index: Ember.Route.extend({
          route: '/'
        })
      })
    });


    app.ApplicationView = Ember.View.extend({
      template: function() { return "Hello!"; }
    });

    app.ApplicationController = Ember.Controller.extend();

    Ember.run(function() { app.initialize(app.stateManager); });
  });

  equal(app.get('router.currentState.path'), 'root.index', "The router moved the state into the right place");
});

test("initialize application with stateManager via initialize call", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router = Ember.Router.extend({
      location: 'none',

      root: Ember.Route.extend({
        index: Ember.Route.extend({
          route: '/'
        })
      })
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "Hello!"; }
    });

    app.ApplicationController = Ember.Controller.extend();

    app.initialize(app.Router.create());
  });

  equal(app.get('router') instanceof Ember.Router, true, "Router was set from initialize call");
  equal(app.get('router.location') instanceof Ember.NoneLocation, true, "Location was set from location implementation name");
  equal(app.get('router.currentState.path'), 'root.index', "The router moved the state into the right place");
});

test("initialize application with stateManager via initialize call from Router class", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router = Ember.Router.extend({
      location: 'none',

      root: Ember.Route.extend({
        index: Ember.Route.extend({
          route: '/'
        })
      })
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "Hello!"; }
    });

    app.ApplicationController = Ember.Controller.extend();

    app.initialize();
  });

  equal(app.get('router') instanceof Ember.Router, true, "Router was set from initialize call");
  equal(app.get('router.currentState.path'), 'root.index', "The router moved the state into the right place");
});

test("injections can be registered in a specified order", function() {

  var oldInjections = Ember.Application.injections;
  var firstInjectionCalled = 0,
      secondInjectionCalled = 0;

  Ember.Application.injections = Ember.A();
  Ember.Application.registerInjection({
    name: 'second',
    injection: function() {
      ok(firstInjectionCalled > 0, 'first injection should be called first');
      secondInjectionCalled++;
    }
  });

  Ember.Application.registerInjection({
    name: 'first',
    injection: function() {
      firstInjectionCalled++;
      ok(secondInjectionCalled === 0, "second injection should not have been called yet");
    },
    before: 'second'
  });

  var router;
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });
    expect(get(Ember.keys(app), 'length') * 2);
    router = Ember.Object.create();

    app.initialize(router);
  });

  Ember.run(function() {
    router.destroy();
  });

  Ember.Application.injections = oldInjections;
});

test("ApplicationView is inserted into the page", function() {
  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "Hello!"; }
    });

    app.ApplicationController = Ember.Controller.extend();

    app.Router = Ember.Router.extend({
      location: 'none',

      root: Ember.Route.extend({
        index: Ember.Route.extend({
          route: '/'
        })
      })
    });

    app.initialize();
  });

  equal(Ember.$("#qunit-fixture").text(), "Hello!");
});

test("ApplicationView and ApplicationController are assumed to exist in all Routers", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  Ember.run(function() {
    app.OneView = Ember.View.extend({
      template: function() { return "Hello!"; }
    });
    app.OneController = Ember.Controller.extend();

    app.Router = Ember.Router.extend({
      location: 'hash',

      root: Ember.Route.extend({
        index: Ember.Route.extend({
          route: '/'
        })
      })
    });
  });

  raises(function(){ Ember.run(function() { app.initialize(); }); }, Error);

});

test("ControllerObject class can be initialized with target, controllers and view properties", function() {
  var stateManager;

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.PostController = Ember.ObjectController.extend();

    stateManager = Ember.StateManager.create();

    Ember.run(function() { app.initialize(stateManager); });

    stateManager.get('postController').set('view', Ember.View.create());
  });

  equal(app.get('router.postController.target') instanceof Ember.StateManager, true, "controller has target");
  equal(app.get('router.postController.controllers') instanceof Ember.StateManager, true, "controller has controllers");
  equal(app.get('router.postController.view') instanceof Ember.View, true, "controller has view");
});
