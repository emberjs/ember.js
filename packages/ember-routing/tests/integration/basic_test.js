var Router, App, AppView, templates, router, container;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = container.lookup('router:main');

  Ember.run(function() {
    router._activeViews.application = AppView.create().appendTo('#qunit-fixture');
    router.startRouting();
  });
}

module("Basic Routing", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Namespace.create();
      App.toString = function() { return "App"; };


      container = Ember.Application.buildContainer(App);

      App.LoadingRoute = Ember.Route.extend({
      });

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Hours</h3>");
      Ember.TEMPLATES.homepage = Ember.Handlebars.compile("<h3>Megatroll</h3><p>{{home}}</p>");

      Router = Ember.Router.extend({
        location: 'none'
      });

      AppView = Ember.View.extend({
        template: Ember.TEMPLATES.app
      });

      container.register('view', 'app');
      container.register('router', 'main', Router);
    });
  }
});

test("The Homepage", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
});

test("The Homepage with explicit template name in renderTemplates", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplates: function() {
      this.render('homepage');
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Megatroll)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test("The Homepage with explicit template name in renderTemplates", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeController = Ember.Route.extend({
    home: "YES I AM HOME"
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplates: function() {
      this.render('homepage');
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Megatroll) + p:contains(YES I AM HOME)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test("The Homepage with a `setupControllers` hook", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    setupControllers: function(controller) {
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

test("The Homepage with a `setupControllers` hook modifying other controllers", function() {
  Router.map(function(match) {
    match("/").to("home");
  });

  App.HomeRoute = Ember.Route.extend({
    setupControllers: function(controller) {
      set(this.controller('home'), 'hours', Ember.A([
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

    setupControllers: function(controller, model) {
      equal(this.controller(), controller);

      set(this.controller('home'), 'hours', model);
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

    setupControllers: function(controller, model) {
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
    setupControllers: function(controller, model) {
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

  App.MenuItem = Ember.Object.extend(Ember.Deferred);
  App.MenuItem.find = function(id) {
    menuItem = App.MenuItem.create({ id: id });
    return menuItem;
  };

  App.LoadingRoute = Ember.Route.extend({

  });

  App.SpecialRoute = Ember.Route.extend({
    setupControllers: function(controller, model) {
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

test("Moving from one page to another triggers the correct callbacks", function() {
  Router.map(function(match) {
    match("/").to("home");
    match("/specials/:menu_item_id").to("special");
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.Deferred);
  App.MenuItem.find = function(id) {
    menuItem = App.MenuItem.create({ id: id });
    return menuItem;
  };

  App.LoadingRoute = Ember.Route.extend({

  });

  App.HomeRoute = Ember.Route.extend({

  });

  App.SpecialRoute = Ember.Route.extend({
    setupControllers: function(controller, model) {
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
      match("/").to("home");
      match("/specials/:menu_item_id").to("special");
    });
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.Deferred);
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

    setupControllers: function() {
      rootSetup++;
    },

    renderTemplates: function() {
      rootRender++;
    }
  });

  App.HomeRoute = Ember.Route.extend({

  });

  App.SpecialRoute = Ember.Route.extend({
    setupControllers: function(controller, model) {
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

  Ember.run(function() {
    router.transitionTo('special', App.MenuItem.create({ id: 1 }));
  });
  equal(rootSetup, 1, "The root setup was not triggered again");
  equal(rootRender, 1, "The root render was not triggered again");
  equal(rootSerialize, 0, "The root serialize was not called");

  // TODO: Should this be changed?
  equal(rootModel, 1, "The root model was called again");

  deepEqual(router.location.path, '/specials/1');
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
      showStuff: function(handler, obj) {
        ok(handler instanceof App.HomeRoute, "the handler is an App.HomeRoute");
        deepEqual(obj, { name: "Tom Dale" }, "the context is correct");
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

asyncTest("Events are triggered on the current state", function() {
  Router.map(function(match) {
    match("/").to("root", function(match) {
      match("/").to("home");
    });
  });

  var model = { name: "Tom Dale" };

  App.RootRoute = Ember.Route.extend({
    events: {
      showStuff: function(handler, obj) {
        ok(handler instanceof App.RootRoute, "the handler is an App.HomeRoute");
        deepEqual(obj, { name: "Tom Dale" }, "the context is correct");
        start();
      }
    }
  });

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return model;
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  bootApplication();

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

// TODO: Parent context change
