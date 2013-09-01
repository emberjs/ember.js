var view;
var application;
var set = Ember.set, get = Ember.get;
var forEach = Ember.ArrayPolyfills.forEach;
var trim = Ember.$.trim;
var originalLookup;
var originalDebug;

module("Ember.Application", {
  setup: function() {
    originalLookup = Ember.lookup;
    originalDebug = Ember.debug;

    Ember.$("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    Ember.run(function() {
      application = Ember.Application.create({ rootElement: '#one', router: null });
    });
  },

  teardown: function() {
    Ember.$("#qunit-fixture").empty();
    Ember.debug = originalDebug;

    Ember.lookup = originalLookup;

    if (application) {
      Ember.run(application, 'destroy');
    }

    if (app) {
      Ember.run(app, 'destroy');
    }
  }
});

test("you can make a new application in a non-overlapping element", function() {
  var app;

  Ember.run(function() {
    app = Ember.Application.create({ rootElement: '#two', router: null });
  });

  Ember.run(app, 'destroy');
  ok(true, "should not raise");
});

test("you cannot make a new application that is a parent of an existing application", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#qunit-fixture' });
    });
  });
});

test("you cannot make a new application that is a descendent of an existing application", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one-child' });
    });
  });
});

test("you cannot make a new application that is a duplicate of an existing application", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one' });
    });
  });
});

test("you cannot make two default applications without a rootElement error", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ router: false });
    });
  });
});

test("acts like a namespace", function() {
  var lookup = Ember.lookup = {}, app;

  Ember.run(function() {
    app = lookup.TestApp = Ember.Application.create({ rootElement: '#two', router: false });
  });

  Ember.BOOTED = false;
  app.Foo = Ember.Object.extend();
  equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
});

var app;

module("Ember.Application initialization", {
  teardown: function() {
    Ember.run(app, 'destroy');
    Ember.TEMPLATES = {};
  }
});

test('initialized application go to initial route', function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application',
      Ember.Handlebars.compile("{{outlet}}")
    );

    Ember.TEMPLATES.index = Ember.Handlebars.compile(
      "<h1>Hi from index</h1>"
    );
  });

  equal(Ember.$('#qunit-fixture h1').text(), "Hi from index");
});

test("initialize application via initialize call", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "<h1>Hello!</h1>"; }
    });
  });

  // This is not a public way to access the container; we just
  // need to make some assertions about the created router
  var router = app.__container__.lookup('router:main');
  equal(router instanceof Ember.Router, true, "Router was set from initialize call");
  equal(router.location instanceof Ember.NoneLocation, true, "Location was set from location implementation name");
});

test("initialize application with stateManager via initialize call from Router class", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application', function() {
      return "<h1>Hello!</h1>";
    });
  });

  var router = app.__container__.lookup('router:main');
  equal(router instanceof Ember.Router, true, "Router was set from initialize call");
  equal(Ember.$("#qunit-fixture h1").text(), "Hello!");
});

test("ApplicationView is inserted into the page", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.ApplicationView = Ember.View.extend({
      render: function(buffer) {
        buffer.push("<h1>Hello!</h1>");
      }
    });

    app.ApplicationController = Ember.Controller.extend();

    app.Router.reopen({
      location: 'none'
    });
  });

  equal(Ember.$("#qunit-fixture h1").text(), "Hello!");
});

test("Minimal Application initialized with just an application template", function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">Hello World</script>');
  Ember.run(function () {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  equal(trim(Ember.$('#qunit-fixture').text()), 'Hello World');
});

test('enable log  of libraries with an ENV var', function() {
  var debug = Ember.debug;
  Ember.LOG_VERSION = true;

  Ember.debug = function(message) {
    ok(true, 'libraries versions logged');
  };

  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });
  });

  Ember.LOG_VERSION = false;
  Ember.debug = debug;
});

test('disable log version of libraries with an ENV var', function() {
  var logged = false;

  Ember.LOG_VERSION = false;

  Ember.debug = function(message) {
    logged = true;
  };

  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });
  });

  ok(!logged, 'libraries versions logged');
});
