module("Rendering in the router");

test("By default, `render` renders into the application's outlet", function() {
  expect(1);

  var router = Ember.Router.extend({
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
    postsRoute.render(router);
  });
});

test("If a view class for a given template exists, use it and update it with the relevant templateName", function() {
  expect(2);

  var PostView = Ember.Object.extend();

  var router = Ember.Router.extend({
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
    postsRoute.render(router);
  });
});

test("The default template to render into is `application`", function() {
  expect(1);

  var router = Ember.Router.extend({
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
    postsRoute.render(router);
  });
});

test("You can override the template to render and the template to render into", function() {
  expect(1);

  var router = Ember.Router.extend({
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
    postsRoute.render(router, { into: 'app', template: 'other' });
  });
});
