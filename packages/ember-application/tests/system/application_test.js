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

    app.Router.reopen({
      location: 'none'
    });

    app.register('template', 'application',
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
  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template', 'application', function() {
      return "<h1>Hello!</h1>";
    });
  });

  var router = app.__container__.lookup('router:main');
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
      render: function(buffer) {
        buffer.push("<h1>Hello!</h1>");
      }
    });

    app.ApplicationController = Ember.Controller.extend();

    app.Router.reopen({
      location: 'none'
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
      rootElement: '#qunit-fixture'
    });
  });

  equal(trim(Ember.$('#qunit-fixture').text()), 'Hello World');
});

var locator;
module("Ember.Application Depedency Injection", {
  setup: function(){
    Ember.run(function(){
      application = Ember.Application.create();
    });

    application.Person = Ember.Object.extend({});
    application.Orange = Ember.Object.extend({});
    application.Email  = Ember.Object.extend({});
    application.User   = Ember.Object.extend({});

    application.register('model:person', application.Person, {singleton: false });
    application.register('model:user', application.User, {singleton: false });
    application.register('fruit:favorite', application.Orange);
    application.register('communication:main', application.Email, {singleton: false});

    locator = application.__container__;
  },
  teardown: function() {
    Ember.run(function(){
      application.destroy();
    });
    application = locator = null;
  }
});

test('registered entities can be looked up later', function(){
  equal(locator.resolve('model:person'), application.Person);
  equal(locator.resolve('model:user'), application.User);
  equal(locator.resolve('fruit:favorite'), application.Orange);
  equal(locator.resolve('communication:main'), application.Email);

  equal(locator.lookup('fruit:favorite'), locator.lookup('fruit:favorite'), 'singleton lookup worked');
  ok(locator.lookup('model:user') !== locator.lookup('model:user'), 'non-singleton lookup worked');
});

test('injections', function(){
  application.inject('model', 'fruit', 'fruit:favorite');
  application.inject('model:user', 'communication', 'communication:main');

  var user = locator.lookup('model:user'),
  person = locator.lookup('model:person'),
  fruit = locator.lookup('fruit:favorite');

  equal(user.get('fruit'), fruit);
  equal(person.get('fruit'), fruit);

  ok(application.Email.detectInstance(user.get('communication')));
});
