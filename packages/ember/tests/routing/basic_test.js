var Router, App, AppView, templates, router, container, originalTemplates;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

function compile(string) {
  return Ember.Handlebars.compile(string);
}

module("Basic Routing", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      App.LoadingRoute = Ember.Route.extend({
      });

      container = App.__container__;

      originalTemplates = Ember.$.extend({}, Ember.TEMPLATES);
      Ember.TEMPLATES.application = compile("{{outlet}}");
      Ember.TEMPLATES.home = compile("<h3>Hours</h3>");
      Ember.TEMPLATES.homepage = compile("<h3>Megatroll</h3><p>{{home}}</p>");
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

test("The Homepage", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
  });

  var currentPath;

  App.ApplicationController = Ember.Route.extend({
    currentPathDidChange: Ember.observer(function() {
      currentPath = get(this, 'currentPath');
    }, 'currentPath')
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(currentPath, 'home');
  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
});

test("The Homepage register as activeView", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/homepage").to("homepage");
  });

  App.HomeRoute = Ember.Route.extend({
  });

  App.HomepageRoute = Ember.Route.extend({
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  ok(router._lookupActiveView('home'), '`home` active view is connected');

  Ember.run(function() {
    router.handleURL("/homepage");
  });

  ok(router._lookupActiveView('homepage'), '`homepage` active view is connected');
  equal(router._lookupActiveView('home'), undefined, '`home` active view is disconnected');
});

test("The Homepage with explicit template name in renderTemplate", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('homepage');
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Megatroll)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test("The Homepage with explicit template name in renderTemplate", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeController = Ember.Route.extend({
    home: "YES I AM HOME"
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('homepage');
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Megatroll) + p:contains(YES I AM HOME)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test('render does not replace templateName if user provided', function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  Ember.TEMPLATES.the_real_home_template = Ember.Handlebars.compile(
    "<p>THIS IS THE REAL HOME</p>"
  );

  App.HomeView = Ember.View.extend({
    templateName: 'the_real_home_template'
  });
  App.HomeController = Ember.Route.extend();
  App.HomeRoute = Ember.Route.extend();

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "THIS IS THE REAL HOME", "The homepage template was rendered");
});

test("The Homepage with a `setupController` hook", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    setupController: function(controller) {
      set(controller, 'hours', Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]));
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  container.register('controller', 'home', Ember.Controller.extend());

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Homepage with a `setupController` hook modifying other controllers", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    setupController: function(controller) {
      set(this.controllerFor('home'), 'hours', Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]));
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  container.register('controller', 'home', Ember.Controller.extend());

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Homepage getting its controller context via model", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]);
    },

    setupController: function(controller, model) {
      equal(this.controllerFor('home'), controller);

      set(this.controllerFor('home'), 'hours', model);
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  container.register('controller', 'home', Ember.Controller.extend());

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Specials Page getting its controller context by deserializing the params hash", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  App.SpecialRoute = Ember.Route.extend({
    model: function(params) {
      return Ember.Object.create({
        menuItemId: params.menu_item_id
      });
    },

    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.menuItemId}}</p>"
  );

  bootApplication();

  container.register('controller', 'special', Ember.Controller.extend());

  Ember.run(function() {
    router.handleURL("/specials/1");
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "1", "The model was used to render the template");
});

test("The Specials Page defaults to looking models up via `find`", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  App.MenuItem = Ember.Object.extend();
  App.MenuItem.find = function(id) {
    return Ember.Object.create({
      id: id
    });
  };

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  bootApplication();

  container.register('controller', 'special', Ember.Controller.extend());

  Ember.run(function() {
    router.handleURL("/specials/1");
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "1", "The model was used to render the template");
});

test("The Special Page returning a promise puts the app into a loading state until the promise is resolved", function() {
  stop();

  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.find = function(id) {
    menuItem = App.MenuItem.create({ id: id });
    return menuItem;
  };

  App.LoadingRoute = Ember.Route.extend({

  });

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  Ember.TEMPLATES.loading = Ember.Handlebars.compile(
    "<p>LOADING!</p>"
  );

  bootApplication();

  container.register('controller', 'special', Ember.Controller.extend());

  Ember.run(function() {
    router.handleURL("/specials/1");
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "LOADING!", "The app is in the loading state");

  Ember.run(function() {
    menuItem.resolve(menuItem);
  });

  setTimeout(function() {
    equal(Ember.$('p', '#qunit-fixture').text(), "1", "The app is now in the specials state");
    start();
  }, 100);
});

test("The Special page returning an error puts the app into the failure state", function() {
  stop();

  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.find = function(id) {
    menuItem = App.MenuItem.create({ id: id });
    return menuItem;
  };

  App.SpecialRoute = Ember.Route.extend({
    setup: function() {
      throw 'Setup error';
    }
  });

  App.FailureRoute = Ember.Route.extend({
  });

  Ember.TEMPLATES.failure = Ember.Handlebars.compile(
    "<p>FAILURE!</p>"
  );

  bootApplication();

  Ember.run(function() {
    router.handleURL("/specials/1");
    menuItem.resolve(menuItem);
  });

  setTimeout(function() {
    equal(Ember.$('p', '#qunit-fixture').text(), "FAILURE!", "The app is now in the failure state");
    start();
  }, 100);
});

test("The Special page returning an error puts the app into a default failure state if none provided", function() {
  stop();

  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  var lastFailure;
  Router.reopenClass({
    defaultFailureHandler: {
      setup: function(error) {
        lastFailure = error;
      }
    }
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.find = function(id) {
    menuItem = App.MenuItem.create({ id: id });
    return menuItem;
  };

  App.SpecialRoute = Ember.Route.extend({
    setup: function() {
      throw 'Setup error';
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/specials/1");
    menuItem.resolve(menuItem);
  });

  setTimeout(function() {
    equal(lastFailure, 'Setup error');
    start();
  }, 100);
});

test("Moving from one page to another triggers the correct callbacks", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.find = function(id) {
    menuItem = App.MenuItem.create({ id: id });
    return menuItem;
  };

  App.LoadingRoute = Ember.Route.extend({

  });

  App.HomeRoute = Ember.Route.extend({

  });

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<h3>Home</h3>"
  );

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  Ember.TEMPLATES.loading = Ember.Handlebars.compile(
    "<p>LOADING!</p>"
  );

  bootApplication();

  container.register('controller', 'special', Ember.Controller.extend());

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");

  Ember.run(function() {
    router.transitionTo('special', App.MenuItem.create({ id: 1 }));
  });

  deepEqual(router.location.path, '/specials/1');
});

test("Nested callbacks are not exited when moving to siblings", function() {
  Router.map(function(match) {
    match("/").to("root", function(match) {
      match("/specials/:menu_item_id").to("special");
    });
  });

  var currentPath;

  App.ApplicationController = Ember.Route.extend({
    currentPathDidChange: Ember.observer(function() {
      currentPath = get(this, 'currentPath');
    }, 'currentPath')
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.find = function(id) {
    menuItem = App.MenuItem.create({ id: id });
    return menuItem;
  };

  App.LoadingRoute = Ember.Route.extend({

  });

  App.RootRoute = Ember.Route.extend({
    model: function() {
      rootModel++;
      return this._super.apply(this, arguments);
    },

    serialize: function() {
      rootSerialize++;
      return this._super.apply(this, arguments);
    },

    setupController: function() {
      rootSetup++;
    },

    renderTemplate: function() {
      rootRender++;
    }
  });

  App.HomeRoute = Ember.Route.extend({

  });

  App.RootSpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES['root/index'] = Ember.Handlebars.compile(
    "<h3>Home</h3>"
  );

  Ember.TEMPLATES['root/special'] = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  Ember.TEMPLATES.loading = Ember.Handlebars.compile(
    "<p>LOADING!</p>"
  );

  var rootSetup = 0, rootRender = 0, rootModel = 0, rootSerialize = 0;

  Ember.run(function() {
    bootApplication();
  });

  container.register('controller', 'special', Ember.Controller.extend());

  equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");
  equal(rootSetup, 1, "The root setup was triggered");
  equal(rootRender, 1, "The root render was triggered");
  equal(rootSerialize, 0, "The root serialize was not called");
  equal(rootModel, 1, "The root model was called");

  router = container.lookup('router:main');

  Ember.run(function() {
    router.transitionTo('root.special', App.MenuItem.create({ id: 1 }));
  });
  equal(rootSetup, 1, "The root setup was not triggered again");
  equal(rootRender, 1, "The root render was not triggered again");
  equal(rootSerialize, 0, "The root serialize was not called");

  // TODO: Should this be changed?
  equal(rootModel, 1, "The root model was called again");

  deepEqual(router.location.path, '/specials/1');
  equal(currentPath, 'root.special');
});

asyncTest("Events are triggered on the controller if a matching action name is implemented", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  var model = { name: "Tom Dale" };
  var stateIsNotCalled = true;

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return model;
    },

    events: {
      showStuff: function(obj) {
        stateIsNotCalled = false;
      }
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  var controller = Ember.Controller.extend({
    showStuff: function(context){
      ok (stateIsNotCalled, "an event on the state is not triggered");
      deepEqual(context, { name: "Tom Dale" }, "an event with context is passed");
      start();
    }
  });

  container.register('controller', 'home', controller);

  bootApplication();


  Ember.run(function() {
    router.handleURL("/");
  });

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

asyncTest("Events are triggered on the current state", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  var model = { name: "Tom Dale" };

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return model;
    },

    events: {
      showStuff: function(obj) {
        ok(this instanceof App.HomeRoute, "the handler is an App.HomeRoute");
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(Ember.copy(obj, true), { name: "Tom Dale" }, "the context is correct");
        start();
      }
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  bootApplication();

  container.register('controller', 'home', Ember.Controller.extend());

  //var controller = router._container.controller.home = Ember.Controller.create();
  //controller.target = router;

  Ember.run(function() {
    router.handleURL("/");
  });

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

asyncTest("Events are triggered on the current state when routes are nested", function() {
  Router.map(function(match) {
    match("/").to("root", function(match) {
    });
  });

  var model = { name: "Tom Dale" };

  App.RootRoute = Ember.Route.extend({
    events: {
      showStuff: function(obj) {
        ok(this instanceof App.RootRoute, "the handler is an App.HomeRoute");
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(Ember.copy(obj, true), { name: "Tom Dale" }, "the context is correct");
        start();
      }
    }
  });

  App.RootIndexRoute = Ember.Route.extend({
    model: function() {
      return model;
    }
  });

  Ember.TEMPLATES['root/index'] = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

test("transitioning multiple times in a single run loop only sets the URL once", function() {
  Router.map(function(match) {
    match("/").to("root");
    match("/foo").to("foo");
    match("/bar").to("bar");
  });

  bootApplication();

  var urlSetCount = 0;

  router.get('location').setURL = function(path) {
    urlSetCount++;
    set(this, 'path', path);
  };

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(urlSetCount, 0);

  Ember.run(function() {
    router.transitionTo("foo");
    router.transitionTo("bar");
  });

  equal(urlSetCount, 1);
  equal(router.get('location').getURL(), "/bar");
});

test('navigating away triggers a url property change', function() {
  var urlPropertyChangeCount = 0;

  Router.map(function(match) {
    match("/").to("root");
    match("/foo").to("foo");
    match("/bar").to("bar");
  });

  bootApplication();

  Ember.run(function() {
    Ember.addObserver(router, 'url', function() {
      urlPropertyChangeCount++;
    });
  });

  equal(urlPropertyChangeCount, 0);

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(urlPropertyChangeCount, 2);

  Ember.run(function() {
    // Trigger the callback that would otherwise be triggered
    // when a user clicks the back or forward button.
    router.router.transitionTo('foo');
    router.router.transitionTo('bar');
  });

  equal(urlPropertyChangeCount, 4, 'triggered url property change');
});


test("using replaceWith calls location.replaceURL if available", function() {
  var setCount = 0,
      replaceCount = 0;

  Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
      setURL: function(path) {
        setCount++;
        set(this, 'path', path);
      },

      replaceURL: function(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function(match) {
    match("/").to("root");
    match("/foo").to("foo");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(setCount, 0);
  equal(replaceCount, 0);

  Ember.run(function() {
    router.replaceWith("foo");
  });

  equal(setCount, 0, 'should not call setURL');
  equal(replaceCount, 1, 'should call replaceURL once');
  equal(router.get('location').getURL(), "/foo");
});

test("using replaceWith calls setURL if location.replaceURL is not defined", function() {
  var setCount = 0;

  Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
      setURL: function(path) {
        setCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function(match) {
    match("/").to("root");
    match("/foo").to("foo");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(setCount, 0);

  Ember.run(function() {
    router.replaceWith("foo");
  });

  equal(setCount, 1, 'should call setURL once');
  equal(router.get('location').getURL(), "/foo");
});

test("It is possible to get the model from a parent route", function() {
  expect(3);

  Router.map(function(match) {
    match("/").to("index");
    match("/posts/:post_id").to("post", function(match) {
      match("/comments").to("comments");
    });
  });

  var post1 = {}, post2 = {}, post3 = {}, currentPost;

  var posts = {
    1: post1,
    2: post2,
    3: post3
  };

  App.PostRoute = Ember.Route.extend({
    model: function(params) {
      return posts[params.post_id];
    }
  });

  App.PostCommentsRoute = Ember.Route.extend({
    model: function() {
      equal(this.modelFor('post'), currentPost);
    }
  });

  bootApplication();

  Ember.run(function() {
    currentPost = post1;
    router.handleURL("/posts/1/comments");
  });

  Ember.run(function() {
    currentPost = post2;
    router.handleURL("/posts/2/comments");
  });

  Ember.run(function() {
    currentPost = post3;
    router.handleURL("/posts/3/comments");
  });
});

test("A redirection hook is provided", function() {
  Router.map(function(match) {
    match("/").to("choose");
    match("/home").to("home");
  });

  var chooseFollowed = 0, destination;

  App.ChooseRoute = Ember.Route.extend({
    redirect: function() {
      if (destination) {
        this.transitionTo(destination);
      }
    },

    setupController: function() {
      chooseFollowed++;
    }
  });

  destination = 'home';

  bootApplication();

  equal(chooseFollowed, 0, "The choose route wasn't entered since a transition occurred");
  equal(Ember.$("h3:contains(Hours)", "#qunit-fixture").length, 1, "The home template was rendered");
});

test("Generated names can be customized when providing routes with dot notation", function() {
  expect(3);

  Ember.TEMPLATES.index = compile("<div>Index</div>");
  Ember.TEMPLATES.application = compile("<h1>Home</h1><div class='main'>{{outlet}}</div>");
  Ember.TEMPLATES.top = compile("<div class='middle'>{{outlet}}</div>");
  Ember.TEMPLATES['foo/bar'] = compile("<div class='bottom'>{{outlet}}</div>");
  Ember.TEMPLATES['baz/bang'] = compile("<p>{{name}}Bottom!</p>");

  Router.map(function(match) {
    match("/top").to("top", function(match) {
      match("/middle").to("foo.bar", function(match) {
        match("/bottom").to("baz.bang");
      });
    });
  });

  App.FooBarRoute = Ember.Route.extend({
    renderTemplate: function() {
      ok(true, "FooBarRoute was called");
      return this._super.apply(this, arguments);
    }
  });

  App.BazBangRoute = Ember.Route.extend({
    renderTemplate: function() {
      ok(true, "BazBangRoute was called");
      return this._super.apply(this, arguments);
    }
  });

  App.FooBarController = Ember.Controller.extend({
    name: "FooBar"
  });

  App.BazBangController = Ember.Controller.extend({
    name: "BazBang"
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/top/middle/bottom");
  });

  equal(Ember.$('.main .middle .bottom p', '#qunit-fixture').text(), "BazBangBottom!", "The templates were rendered into their appropriate parents");
});

test("Child routes render into their parent route's template by default", function() {
  Ember.TEMPLATES.index = compile("<div>Index</div>");
  Ember.TEMPLATES.application = compile("<h1>Home</h1><div class='main'>{{outlet}}</div>");
  Ember.TEMPLATES.top = compile("<div class='middle'>{{outlet}}</div>");
  Ember.TEMPLATES['top/middle'] = compile("<div class='bottom'>{{outlet}}</div>");
  Ember.TEMPLATES['middle/bottom'] = compile("<p>Bottom!</p>");

  Router.map(function(match) {
    match("/top").to("top", function(match) {
      match("/middle").to("middle", function(match) {
        match("/bottom").to("bottom");
      });
    });
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/top/middle/bottom");
  });

  equal(Ember.$('.main .middle .bottom p', '#qunit-fixture').text(), "Bottom!", "The templates were rendered into their appropriate parents");
});


test("Parent route context change", function() {
  var editCount = 0;

  Ember.TEMPLATES.application = compile("{{outlet}}");
  Ember.TEMPLATES.posts = compile("{{outlet}}");
  Ember.TEMPLATES['posts/post'] = compile("{{outlet}}");
  Ember.TEMPLATES['post/index'] = compile("showing");
  Ember.TEMPLATES['post/edit'] = compile("editing");

  Router.map(function(match) {
    match("/posts").to("posts", function(match) {
      match("/:postId").to('post', function(match) {
        match("/edit").to('edit');
      });
    });
  });

  App.PostsRoute = Ember.Route.extend({
    events: {
      showPost: function(context) {
        this.transitionTo('post', context);
      }
    }
  });

  App.PostsPostRoute = Ember.Route.extend({
    model: function(params) {
      return {id: params.postId};
    },

    events: {
      editPost: function(context) {
        this.transitionTo('post.edit');
      }
    }
  });

  App.PostEditRoute = Ember.Route.extend({
    setup: function() {
      this._super.apply(this, arguments);
      editCount++;
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/posts/1");
  });

  Ember.run(function() {
    router.send('editPost');
  });

  Ember.run(function() {
    router.send('showPost', {id: 2});
  });

  Ember.run(function() {
    router.send('editPost');
  });

  equal(editCount, 2, 'set up the edit route twice without failure');
});
