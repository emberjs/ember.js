var Router, App, AppView, templates, router, urls;
var get = Ember.get, set = Ember.set;

function bootApplication() {
  router = Router.create({
    updateURL: function(url) {
      urls.push(url);
    }
  });

  Ember.run(function() {
    router._container.view.application = AppView.create().appendTo('#qunit-fixture');
  });
}

module("Basic Routing", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Namespace.create();
      App.toString = function() { return "App"; };

      App.LoadingRoute = Ember.Route.extend({
      });

      urls = [];

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.home = Ember.Handlebars.compile("<h3>Hours</h3>");
      Ember.TEMPLATES.homepage = Ember.TEMPLATES.home;

      AppView = Ember.View.extend({
        template: Ember.TEMPLATES.app
      });

      Router = Ember.Router.extend({
        namespace: App,
        templates: Ember.TEMPLATES
      });
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

  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
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

  router._container.controller.home = Ember.Controller.create();

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

  router._container.controller.home = Ember.Controller.create();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Homepage getting its controller context via controllerContext", function() {
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
      set(this.controller('home'), 'hours', model);
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  router._container.controller.home = Ember.Controller.create();

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

  router._container.controller.special = Ember.Controller.create();

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

  router._container.controller.special = Ember.Controller.create();

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

  router._container.controller.special = Ember.Controller.create();

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

  router._container.controller.special = Ember.Controller.create();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");

  Ember.run(function() {
    router.transitionTo('special', App.MenuItem.create({ id: 1 }));
  });

  deepEqual(urls, ['/specials/1']);
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

  var rootSetup = 0, rootRender = 0, rootModel = 0, rootSerialize = 0;

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

  bootApplication();

  router._container.controller.special = Ember.Controller.create();

  Ember.run(function() {
    router.handleURL("/");
  });

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
  equal(rootModel, 2, "The root model was called again");

  deepEqual(urls, ['/specials/1']);
});

// TODO: Parent context change
