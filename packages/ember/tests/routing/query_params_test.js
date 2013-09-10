var Router, App, AppView, templates, router, container, originalTemplates;
var get = Ember.get, set = Ember.set;

function bootApplication(url) {
  router = container.lookup('router:main');
  if(url) { router.location.setURL(url); }
  Ember.run(App, 'advanceReadiness');
}

function compile(string) {
  return Ember.Handlebars.compile(string);
}

function handleURL(path) {
  return Ember.run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

function handleURLAborts(path) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'url: `' + path + '` was NOT to be handled');
    }, function(reason) {
      ok(reason && reason.message === "TransitionAborted",  'url: `' + path + '` was to be aborted');
    });
  });
}

function shouldNotHappen(error) {
  console.error(error.stack);
  ok(false, "this .then handler should not be called: " + error.message);
}

function handleURLRejectsWith(path, expectedReason) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'expected handleURLing: `' + path + '` to fail');
    }, function(reason) {
      equal(expectedReason, reason);
    });
  });
}
if (Ember.FEATURES.isEnabled("query-params")) {
  module("Routing with Query Params", {
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
        Ember.TEMPLATES.camelot = compile('<section><h3>Is a silly place</h3></section>');
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

  test("The Homepage with Query Params", function() {
    expect(5);

    Router.map(function() {
      this.route("index", { path: "/", queryParams: ['foo', 'baz'] });
    });

    App.IndexRoute = Ember.Route.extend({
      beforeModel: function(queryParams, transition) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "beforeModel hook is called with query params");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "Model hook is called with query params");
      },

      afterModel: function(resolvedModel, queryParams, transition) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "afterModel hook is called with query params");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "setupController hook is called with query params");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "renderTemplates hook is called with query params");
      }

    });


    bootApplication("/?foo=bar&baz");
  });


  asyncTest("Transitioning query params works on the same route", function() {
    expect(25);

    var expectedQueryParams;

    Router.map(function() {
      this.route("home", { path: "/" });
      this.resource("special", { path: "/specials/:menu_item_id", queryParams: ['view'] });
    });

    App.SpecialRoute = Ember.Route.extend({
      beforeModel: function (queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the model hook");
        return {id: params.menu_item_id};
      },

      afterModel: function (resolvedModel, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the setupController hook");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the renderTemplates hook");
      },

      serialize: function (obj) {
        return {menu_item_id: obj.id};
      }
    });


    Ember.TEMPLATES.home = Ember.Handlebars.compile(
      "<h3>Home</h3>"
    );


    Ember.TEMPLATES.special = Ember.Handlebars.compile(
      "<p>{{content.id}}</p>"
    );

    bootApplication();

    var transition = handleURL('/');

    Ember.run(function() {
      transition.then(function() {
        equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");

        expectedQueryParams = {};
        return router.transitionTo('special', {id: 1});
      }, shouldNotHappen).then(function(result) {
        deepEqual(router.location.path, '/specials/1', "Correct URL after transitioning");

        expectedQueryParams = {view: 'details'};
        return router.transitionTo('special', {queryParams: {view: 'details'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=details', "Correct URL after transitioning with route name and query params");

        expectedQueryParams = {view: 'other'};
        return router.transitionTo({queryParams: {view: 'other'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=other', "Correct URL after transitioning with query params only");

        expectedQueryParams = {view: 'three'};
        return router.transitionTo("/specials/1?view=three");
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=three', "Correct URL after transitioning with url");

        start();
      }, shouldNotHappen);
    });
  });


  asyncTest("Transitioning query params works on a different route", function() {
    expect(46);

    var expectedQueryParams, expectedOtherQueryParams;

    Router.map(function() {
      this.route("home", { path: "/" });
      this.resource("special", { path: "/specials/:menu_item_id", queryParams: ['view'] });
      this.resource("other", { path: "/others/:menu_item_id", queryParams: ['view', 'lang'] });
    });

    App.SpecialRoute = Ember.Route.extend({
      beforeModel: function (queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the model hook");
        return {id: params.menu_item_id};
      },

      afterModel: function (resolvedModel, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the setupController hook");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the renderTemplates hook");
      },

      serialize: function (obj) {
        return {menu_item_id: obj.id};
      }
    });

    App.OtherRoute = Ember.Route.extend({
      beforeModel: function (queryParams, transition) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the beforeModel hook");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the model hook");
        return {id: params.menu_item_id};
      },

      afterModel: function (resolvedModel, queryParams, transition) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the beforeModel hook");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the setupController hook");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the renderTemplates hook");
      },

      serialize: function (obj) {
        return {menu_item_id: obj.id};
      }
    });



    Ember.TEMPLATES.home = Ember.Handlebars.compile(
      "<h3>Home</h3>"
    );


    Ember.TEMPLATES.special = Ember.Handlebars.compile(
      "<p>{{content.id}}</p>"
    );

    bootApplication();

    var transition = handleURL('/');

    Ember.run(function() {
      transition.then(function() {
        equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");

        expectedQueryParams = {};

        return router.transitionTo('special', {id: 1});
      }, shouldNotHappen).then(function(result) {
        deepEqual(router.location.path, '/specials/1', "Correct URL after transitioning");

        expectedQueryParams = {view: 'details'};
        return router.transitionTo('special', {queryParams: {view: 'details'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=details', "Correct URL after transitioning with route name and query params");

        expectedOtherQueryParams = {view: 'details'};

        return router.transitionTo('other', {id: 2});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/others/2?view=details', "Correct URL after transitioning to other route");

        expectedOtherQueryParams = {view: 'details', lang: 'en'};
        return router.transitionTo({queryParams: {lang: 'en'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/others/2?view=details&lang=en', "Correct URL after transitioning to other route");

        expectedQueryParams = {view: 'details'};

        return router.transitionTo("special", {id: 2});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2?view=details', "Correct URL after back to special route");

        expectedQueryParams = {};

        return router.transitionTo({queryParams: false});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2', "queryParams: false clears queryParams");

        expectedQueryParams = {view: 'details'};

       return router.transitionTo("special", {id: 2}, {queryParams: {view: 'details'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2?view=details', "Correct URL after back to special route");

        expectedQueryParams = {};

        return router.transitionTo("/specials/2");
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2', "url transition clears queryParams");

        start();
      }, shouldNotHappen);
    });
  });



  test("Redirecting to the current target with a different query param aborts the remainder of the routes", function() {
    expect(4);

    Router.map(function() {
      this.route("home");
      this.resource("foo", function() {
        this.resource("bar", { path: "bar/:id" }, function() {
          this.route("baz", { queryParams: ['foo']});
        });
      });
    });

    var model = { id: 2 };

    var count = 0;

    App.BarRoute = Ember.Route.extend({
      afterModel: function(context) {
        if (count++ > 10) {
          ok(false, 'infinite loop');
        } else {
          this.transitionTo("bar.baz", {queryParams: {foo: 'bar'}});
        }
      },

      serialize: function(params) {
        return params;
      }
    });

    App.BarBazRoute = Ember.Route.extend({
      setupController: function() {
        ok(true, "Should still invoke setupController");
      }
    });

    bootApplication();

    handleURLAborts("/foo/bar/2/baz");

    equal(router.container.lookup('controller:application').get('currentPath'), 'foo.bar.baz');
    equal(router.get('location').getURL(), "/foo/bar/2/baz?foo=bar");
  });

  test("Parent route query params change", function() {
    expect(4);

    var editCount = 0,
        expectedQueryParams = {};

    Ember.TEMPLATES.application = compile("{{outlet}}");
    Ember.TEMPLATES.posts = compile("{{outlet}}");
    Ember.TEMPLATES.post = compile("{{outlet}}");
    Ember.TEMPLATES['post/index'] = compile("showing");
    Ember.TEMPLATES['post/edit'] = compile("editing");

    Router.map(function() {
      this.resource("posts", {queryParams: ['sort']}, function() {
        this.resource("post", { path: "/:postId" }, function() {
          this.route("edit");
        });
      });
    });

    App.PostsRoute = Ember.Route.extend({
      events: {
        sort: function(dir) {
          this.transitionTo({queryParams: {sort: dir}});
        }
      },

      setupController: function(controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "Posts route has correct query params");
      }
    });

    App.PostRoute = Ember.Route.extend({
      events: {
        editPost: function(context) {
          this.transitionTo('post.edit');
        }
      }
    });

    App.PostEditRoute = Ember.Route.extend({
      setup: function() {
        editCount++;
      }
    });

    bootApplication();

    handleURL("/posts/1");

    Ember.run(function() {
      router.send('editPost');
    });

    expectedQueryParams = {sort: 'desc'};

    Ember.run(function() {
      router.send('sort', 'desc');
    });

    equal(editCount, 2, 'set up the edit route twice without failure');
  });
}
