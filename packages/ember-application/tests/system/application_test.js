require('ember-routing');

var view;
var application;
var set = Ember.set, get = Ember.get;
var trim = Ember.$.trim;

module("Ember.Application", {
  setup: function() {
    Ember.$("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    Ember.run(function() {
      application = Ember.Application.create({ rootElement: '#one', router: null });
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
    app = Ember.Application.create({ rootElement: '#two', router: null });
  });
  Ember.run(function() {
    app.destroy();
  });
  ok(true, "should not raise");
});

test("you cannot make a new application that is a parent of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#qunit-fixture' });
    });
  }, Error);
});

test("you cannot make a new application that is a descendent of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one-child' });
    });
  }, Error);
});

test("you cannot make a new application that is a duplicate of an existing application", function() {
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one' });
    });
  }, Error);
});

test("you cannot make two default applications without a rootElement error", function() {
  // Teardown existing
  Ember.run(function() {
    application.destroy();
  });

  Ember.run(function() {
    application = Ember.Application.create({ router: false });
  });
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ router: false });
    });
  }, Error);
});

test("acts like a namespace", function() {
  var originalLookup = Ember.lookup;

  try {
    var lookup = Ember.lookup = {}, app;
    Ember.run(function() {
      app = lookup.TestApp = Ember.Application.create({ rootElement: '#two', router: false });
    });
    Ember.BOOTED = false;
    app.Foo = Ember.Object.extend();
    equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
    Ember.run(function() {
      app.destroy();
    });
  } finally {
    Ember.lookup = originalLookup;
  }
});

var app;

module("Ember.Application initialization", {
  teardown: function() {
    Ember.TEMPLATES = {};
    Ember.run(function(){ app.destroy(); });
  }
});

test('initialized application go to initial route', function() {
  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router = Ember.Router.extend();

    app.Router.map(function(match) {
      match("/").to("index");
    });

    app.container.register('template', 'application',
      Ember.Handlebars.compile("{{outlet}}")
    );

    Ember.TEMPLATES.index = Ember.Handlebars.compile(
      "<h1>Hi from index</h1>"
    );
  });

  equal(Ember.$('#qunit-fixture h1').text(), "Hi from index");
});

test("initialize application via initialize call", function() {
  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router = Ember.Router.extend({
      location: 'none'
    });

    app.Router.map(function(match) {
      match("/").to("index");
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "<h1>Hello!</h1>"; }
    });
  });

  var router = app.container.lookup('router:main');
  equal(router instanceof Ember.Router, true, "Router was set from initialize call");
  equal(router.location instanceof Ember.NoneLocation, true, "Location was set from location implementation name");
});

test("initialize application with stateManager via initialize call from Router class", function() {
  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router = Ember.Router.extend({
      location: 'none'
    });

    app.Router.map(function(match) {
      match("/").to("index");
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "<h1>Hello!</h1>"; }
    });
  });

  var router = app.container.lookup('router:main');
  equal(router instanceof Ember.Router, true, "Router was set from initialize call");
  equal(Ember.$("#qunit-fixture h1").text(), "Hello!");
});

test("ApplicationView is inserted into the page", function() {
  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "<h1>Hello!</h1>"; }
    });

    app.ApplicationController = Ember.Controller.extend();

    app.Router = Ember.Router.extend({
      location: 'none'
    });

    app.Router.map(function(match) {
      match("/").to("index");
    });
  });

  equal(Ember.$("#qunit-fixture").text(), "Hello!");
});

test("Application initialized twice raises error", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  raises(function(){
    Ember.run(function() {
      app.initialize();
    });
  }, Error, 'raises error');
});

test("Minimal Application initialized with just an application template", function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">Hello World</script>');
  Ember.run(function () {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  equal(trim(Ember.$('#qunit-fixture').text()), 'Hello World');
});
