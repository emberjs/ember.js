var view;
var application;
var set = Ember.set, get = Ember.get;
var trim = Ember.$.trim;

module("Ember.Application", {
  setup: function() {
    Ember.$("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    Ember.run(function() {
      application = Ember.Application.create({ rootElement: '#one', router: null }).initialize();
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
    app = Ember.Application.create({ rootElement: '#two', router: null }).initialize();
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
    application = Ember.Application.create({ router: false }).initialize();
  });
  raises(function() {
    Ember.run(function() {
      Ember.Application.create({ router: false }).initialize();
    });
  }, Error);
});

test("acts like a namespace", function() {
  var originalLookup = Ember.lookup;

  try {
    var lookup = Ember.lookup = {}, app;
    Ember.run(function() {
      app = lookup.TestApp = Ember.Application.create({ rootElement: '#two', router: false }).initialize();
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

    app.initialize();
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

    app.initialize();
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

    app.initialize();
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

    app.initialize();
  });

  equal(Ember.$("#qunit-fixture").text(), "Hello!");
});

test("Application initialized twice raises error", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    }).initialize();
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
    }).initialize();
  });

  equal(trim(Ember.$('#qunit-fixture').text()), 'Hello World');
});

var locator, originalLookup = Ember.lookup, lookup;

module("Ember.Application Depedency Injection", {
  setup: function(){
    Ember.run(function(){
      application = Ember.Application.create().initialize();
    });

    application.Person              = Ember.Object.extend({});
    application.Orange              = Ember.Object.extend({});
    application.Email               = Ember.Object.extend({});
    application.User                = Ember.Object.extend({});
    application.PostIndexController = Ember.ObjectController.extend({});

    application.register('model:person', application.Person, {singleton: false });
    application.register('model:user', application.User, {singleton: false });
    application.register('fruit:favorite', application.Orange);
    application.register('communication:main', application.Email, {singleton: false});
    application.register('controller:postIndex', application.PostIndexController, {singleton: true});

    locator = application.__container__;

    lookup = Ember.lookup = {};
  },
  teardown: function() {
    Ember.run(function(){
      application.destroy();
    });
    application = locator = null;
    Ember.lookup = originalLookup;
  }
});

test('container lookup is normalized', function() {
  ok(locator.lookup('controller:post.index') instanceof application.PostIndexController);
  ok(locator.lookup('controller:postIndex') instanceof application.PostIndexController);
});

test('registered entities can be looked up later', function(){
  equal(locator.resolve('model:person'), application.Person);
  equal(locator.resolve('model:user'), application.User);
  equal(locator.resolve('fruit:favorite'), application.Orange);
  equal(locator.resolve('communication:main'), application.Email);
  equal(locator.resolve('controller:postIndex'), application.PostIndexController);

  equal(locator.lookup('fruit:favorite'), locator.lookup('fruit:favorite'), 'singleton lookup worked');
  ok(locator.lookup('model:user') !== locator.lookup('model:user'), 'non-singleton lookup worked');
});


test('injections', function() {
  application.inject('model', 'fruit', 'fruit:favorite');
  application.inject('model:user', 'communication', 'communication:main');

  var user = locator.lookup('model:user'),
  person = locator.lookup('model:person'),
  fruit = locator.lookup('fruit:favorite');

  equal(user.get('fruit'), fruit);
  equal(person.get('fruit'), fruit);

  ok(application.Email.detectInstance(user.get('communication')));
});

test('injection defines a property on ObjectController', function() {
  application.inject('controller:postIndex', 'fruit', 'fruit:favorite');

  var controller = locator.lookup('controller:postIndex'),
      fruit = locator.lookup('fruit:favorite');

  equal(controller.get('fruit'), fruit);
});

test('the default resolver hook can look things up in other namespaces', function() {
  var UserInterface = lookup.UserInterface = Ember.Namespace.create();
  UserInterface.NavigationController = Ember.Controller.extend();

  var nav = locator.lookup('controller:userInterface/navigation');

  ok(nav instanceof UserInterface.NavigationController, "the result should be an instance of the specified class");
});

test('normalization', function() {
  equal(locator.normalize('foo:bar'), 'foo:bar');

  equal(locator.normalize('controller:posts'), 'controller:posts');
  equal(locator.normalize('controller:posts_index'), 'controller:postsIndex');
  equal(locator.normalize('controller:posts.index'), 'controller:postsIndex');
  equal(locator.normalize('controller:posts.post.index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:posts_post.index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:posts.post_index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:postsIndex'), 'controller:postsIndex');
  equal(locator.normalize('controller:blogPosts.index'), 'controller:blogPostsIndex');
  equal(locator.normalize('controller:blog/posts.index'), 'controller:blog/postsIndex');
  equal(locator.normalize('controller:blog/posts.post.index'), 'controller:blog/postsPostIndex');
  equal(locator.normalize('controller:blog/posts_post.index'), 'controller:blog/postsPostIndex');

  equal(locator.normalize('template:blog/posts_index'), 'template:blog/posts_index');
});

test('normalization is indempotent', function() {
  var examples = ['controller:posts', 'controller:posts.post.index', 'controller:blog/posts.post_index', 'template:foo_bar'];

  examples.forEach(function (example) {
    equal(locator.normalize(locator.normalize(example)), locator.normalize(example));
  });
});

