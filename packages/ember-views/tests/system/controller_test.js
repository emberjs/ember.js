var originalLookup = Ember.lookup, TestApp, lookup;

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
      lookup.TestApp.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("connectOutlet instantiates a view, controller, and connects them", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });
  TestApp.PostView.reopen({
    controller: postController
  });

  var view = appController.connectOutlet('view', TestApp.PostView);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");
});

test("connectOutlet takes an optional outlet name", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });
  TestApp.PostView.reopen({
    controller: postController
  });

  var view = appController.connectOutlet('mainView', TestApp.PostView);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
});

test("if the controller is explicitly set to null while connecting an outlet, the instantiated view will inherit its controller from its parent view", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });

  var view = appController.connectOutlet('mainView', TestApp.PostView);

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
    controllers: {}
  });

  var view = appController.connectOutlet('view', TestApp.PostView);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), null, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");

  var containerView = Ember.ContainerView.create({
    controller: postController
  });

  containerView.get('childViews').pushObject(view);
  equal(view.get('controller'), postController, "the controller was inherited from the parent");
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

test("can disconnect outlet from controller", function() {
  var appController = TestApp.ApplicationController.create({
    controllers: {}
  });

  var view = appController.connectOutlet('view', TestApp.PostView);

  equal(appController.get('view'), view, "the app controller's view is set");

  appController.disconnectOutlet();

  equal(appController.get('view'), null, "the app controller's view is null");

  view = appController.connectOutlet('master', TestApp.PostView);

  equal(appController.get('master'), view, "the app controller's master view is set");

  appController.disconnectOutlet('master');

  equal(appController.get('master'), null, "the app controller's master view is null");
});
