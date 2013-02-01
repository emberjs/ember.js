var originalLookup = Ember.lookup, TestApp, lookup, view, containerView;

module("Ember.Controller#connectOutlet", {
  setup: function() {
    lookup = Ember.lookup = {};

    Ember.run(function () {
      lookup.TestApp = TestApp = Ember.Application.create();
    });


    TestApp.ApplicationController = Ember.Controller.extend();

    TestApp.PostController = Ember.Controller.extend();
    TestApp.PostView = Ember.View.extend();
  },

  teardown: function() {
    Ember.run(function () {
      if (view) { view.destroy(); }
      if (containerView) { containerView.destroy(); }
      lookup.TestApp.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("connectOutlet instantiates a view, controller, and connects them", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });
  view = appController.connectOutlet('post');

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");
});

test("connectOutlet takes an optional outlet name", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });
  view = appController.connectOutlet({ name: 'post', outletName: 'mainView' });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
});

test("connectOutlet takes an optional controller context", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });
  view = appController.connectOutlet('post', context);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");
  equal(view.get('controller.content'), context, "the controller receives the context");
});

test("connectOutlet with outletName, name syntax", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });

  view = appController.connectOutlet('main', 'post', context);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('main'), view, "the app controller's view is set");
  equal(view.get('controller.content'), context, "the controller receives the context");
});

test("connectOutlet works if all three parameters are provided", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });
  view = appController.connectOutlet({ name: 'post', outletName: 'mainView', context: context });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
  equal(view.get('controller.content'), context, "the controller receives the context");
});

test("connectOutlet works if a hash of options is passed", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });

  view = appController.connectOutlet({
    outletName: 'mainView',
    viewClass: TestApp.PostView,
    controller: postController,
    context: context
  });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
  equal(view.get('controller.content'), context, "the controller receives the context");
});

test("if the controller is explicitly set to null while connecting an outlet, the instantiated view will inherit its controller from its parent view", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });

  view = appController.connectOutlet({
    outletName: 'mainView',
    viewClass: TestApp.PostView,
    controller: null
  });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), null, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");

  containerView = Ember.ContainerView.create({
    controller: postController
  });

  containerView.pushObject(view);
  equal(view.get('controller'), postController, "the controller was inherited from the parent");
});

test("if the controller is not given while connecting an outlet, the instantiated view will inherit its controller from its parent view", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: {},
    namespace: TestApp
  });

  view = appController.connectOutlet('post');

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), null, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");

  containerView = Ember.ContainerView.create({
    controller: postController
  });

  containerView.pushObject(view);
  equal(view.get('controller'), postController, "the controller was inherited from the parent");
});

test("can disconnect outlet from controller", function() {
  var appController = TestApp.ApplicationController.create({
    controllers: {},
    namespace: TestApp
  });

  view = appController.connectOutlet('post');

  equal(appController.get('view'), view, "the app controller's view is set");

  appController.disconnectOutlet();

  equal(appController.get('view'), null, "the app controller's view is null");

  Ember.run(function() { view.destroy(); });
  view = appController.connectOutlet({outletName: 'master', name: 'post'});

  equal(appController.get('master'), view, "the app controller's master view is set");

  appController.disconnectOutlet('master');

  equal(appController.get('master'), null, "the app controller's master view is null");
});

module("Ember.Controller#connectControllers", {
  setup: function() {
    lookup = Ember.lookup = {};

    Ember.run(function () {
      lookup.TestApp = TestApp = Ember.Application.create();
    });


    TestApp.ApplicationController = Ember.Controller.extend();

    TestApp.PostController = Ember.Controller.extend();
    TestApp.PostView = Ember.View.extend();
  },

  teardown: function() {
    Ember.run(function () {
      lookup.TestApp.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("connectControllers injects other controllers", function() {
  var postController = {}, commentController = {};

  var controller = Ember.Controller.create({
    controllers: {
      postController: postController,
      commentController: commentController
    }
  });

  controller.connectControllers('post', 'comment');

  equal(controller.get('postController'), postController, "should connect postController");
  equal(controller.get('commentController'), commentController, "should connect commentController");
});
