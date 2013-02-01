var router;

module("Rendering in the router", {
  teardown: function() {
    Ember.run(function() {
      var view = router.get('applicationController.view') ||
                 router.get('appController.view');
      if (view) { view.destroy(); }
      router.destroy();
    });
  }
});

test("By default, `render` renders into the application's outlet", function() {
  expect(1);

  router = Ember.Router.extend({
    applicationController: Ember.Controller.extend({
      viewDidChange: Ember.observer(function() {
        equal(this.get('view.templateName'), 'posts');
      }, 'view')
    }).create(),

    namespace: {},

    root: Ember.Route.extend({
      template: 'application',

      posts: Ember.Route.extend({
        template: 'posts'
      })
    })
  }).create();

  var postsRoute = router.get('states.root.states.posts');

  Ember.run(function() {
    postsRoute.render();
  });
});

test("If a view class for a given template exists, use it and update it with the relevant templateName", function() {
  expect(2);

  var PostView = Ember.Object.extend();

  router = Ember.Router.extend({
    applicationController: Ember.Controller.extend({
      viewDidChange: Ember.observer(function() {
        ok(this.get('view') instanceof PostView, "The view is an instance of PostView");
        equal(this.get('view.templateName'), 'post');
      }, 'view')
    }).create(),

    namespace: {
      PostView: PostView
    },

    root: Ember.Route.extend({
      template: 'application',

      posts: Ember.Route.extend({
        template: 'post'
      })
    })
  }).create();

  var postsRoute = router.get('states.root.states.posts');

  Ember.run(function() {
    postsRoute.render();
  });
});

test("The default template to render into is `application`", function() {
  expect(1);

  router = Ember.Router.extend({
    applicationController: Ember.Controller.extend({
      viewDidChange: Ember.observer(function() {
        equal(this.get('view.templateName'), 'posts');
      }, 'view')
    }).create(),

    namespace: {},

    root: Ember.Route.extend({
      posts: Ember.Route.extend({
        template: 'posts'
      })
    })
  }).create();

  var postsRoute = router.get('states.root.states.posts');

  Ember.run(function() {
    postsRoute.render();
  });
});

test("You can override the template to render and the template to render into", function() {
  expect(1);

  router = Ember.Router.extend({
    appController: Ember.Controller.extend({
      viewDidChange: Ember.observer(function() {
        equal(this.get('view.templateName'), 'other');
      }, 'view')
    }).create(),

    namespace: {},

    root: Ember.Route.extend({
      posts: Ember.Route.extend({
        template: 'posts'
      })
    })
  }).create();

  var postsRoute = router.get('states.root.states.posts');

  Ember.run(function() {
    postsRoute.render({ into: 'app', template: 'other' });
  });
});

test("By default, the route's class name is used to infer its template name", function() {
  var PostsRoute = Ember.Route.extend();
  PostsRoute.toString = function() { return "App.PostsRoute"; };

  var ApplicationRoute = Ember.Route.extend({
    posts: PostsRoute
  });
  ApplicationRoute.toString = function() { return "App.ApplicationRoute"; };

  router = Ember.Router.extend({
    applicationController: Ember.Controller.extend({
      viewDidChange: Ember.observer(function() {
        equal(this.get('view.templateName'), 'posts');
      }, 'view')
    }).create(),

    namespace: {},

    root: Ember.Route.extend({
      posts: PostsRoute
    })
  }).create();

  Ember.run(function() {
    router.get('states.root.states.posts').render();
  });
});
