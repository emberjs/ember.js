/*globals TestApp*/

var get = Ember.get, getPath = Ember.getPath, set = Ember.set;

module("Ember.Controller#connectOutlet", {
  setup: function() {
    Ember.run(function () {
      window.TestApp = Ember.Application.create();
    });


    TestApp.ApplicationController = Ember.Controller.extend();

    TestApp.PostController = Ember.Controller.extend();
    TestApp.PostView = Ember.View.extend();
  },

  teardown: function() {
    Ember.run(function () {
      window.TestApp.destroy();
    });
    window.TestApp = undefined;
  }
});

test("connectOutlet instantiates a view, controller, and connects them", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });
  var view = appController.connectOutlet('post');

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
  var view = appController.connectOutlet({ name: 'post', outletName: 'mainView' });

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
  var view = appController.connectOutlet('post', context);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");
  equal(view.getPath('controller.content'), context, "the controller receives the context");
});

test("connectOutlet with outletName, name syntax", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });

  var view = appController.connectOutlet('main', 'post', context);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('main'), view, "the app controller's view is set");
  equal(view.getPath('controller.content'), context, "the controller receives the context");
});

test("connectOutlet works if all three parameters are provided", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });
  var view = appController.connectOutlet({ name: 'post', outletName: 'mainView', context: context });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
  equal(view.getPath('controller.content'), context, "the controller receives the context");
});

test("connectOutlet works if a hash of options is passed", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });

  var view = appController.connectOutlet({
    outletName: 'mainView',
    viewClass: TestApp.PostView,
    controller: postController,
    context: context
  });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
  equal(view.getPath('controller.content'), context, "the controller receives the context");
});

test("if the controller is explicitly set to null while connecting an outlet, the instantiated view will inherit its controller from its parent view", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });

  var view = appController.connectOutlet({
    outletName: 'mainView',
    viewClass: TestApp.PostView,
    controller: null
  });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), null, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");

  var containerView = Ember.ContainerView.create({
    controller: postController
  });

  containerView.get('childViews').pushObject(view);
  equal(view.get('controller'), postController, "the controller was inherited from the parent");
});

test("if the controller is not given while connecting an outlet, the instantiated view will inherit its controller from its parent view", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: {},
    namespace: TestApp
  });

  var view = appController.connectOutlet('post');

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), null, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");

  var containerView = Ember.ContainerView.create({
    controller: postController
  });

  containerView.get('childViews').pushObject(view);
  equal(view.get('controller'), postController, "the controller was inherited from the parent");
});

test("connectOutlet instantiates a shared view, controller, and connects them", function() {
  var postController = Ember.Controller.create();

  TestApp.PostView.reopen({isShared: true});

  TestApp.CommentView = Ember.View.extend({isShared: true});

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController, commentController: Ember.Controller.create() },
    namespace: { PostView: TestApp.PostView, CommentView: TestApp.CommentView }
  });
  var outlets = appController._outlets;
  var view = appController.connectOutlet('post');

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");
  equal(outlets.get('view').get(TestApp.PostView), view, "the shared view instance is set on the controller");

  view = appController.connectOutlet('comment');
  equal(appController.get('view'), view, "the app controller's view is set to the new view");
  equal(outlets.get('view').get(TestApp.CommentView), view, "the new shared view instance is set on the controller");
});

test("connectOutlet takes an optional outlet name with shared view", function() {
  var postController = Ember.Controller.create();

  TestApp.PostView.reopen({isShared: true});

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController },
    namespace: { PostView: TestApp.PostView }
  });
  var outlets = appController._outlets;
  var view = appController.connectOutlet({ name: 'post', outletName: 'mainView' });

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
  equal(outlets.get('mainView').get(TestApp.PostView), view, "the shared view instance is set on the controller");
});

test("setting the same controller on a view should not trigger rerendering", function() {
  var postView = TestApp.PostView.create();
  var postController = TestApp.PostController.create();

  set(postView, 'controller', postController);

  Ember.run(function() {
    postView.appendTo('#qunit-fixture');
    equal(postView.state, 'preRender', 'view is in preRender state');
  });

  Ember.run(function() {
    equal(postView.state, 'inDOM', 'view is in DOM state');
    set(postView, 'controller', postController);
    equal(postView.state, 'inDOM', 'view still in DOM state');
  });
});
