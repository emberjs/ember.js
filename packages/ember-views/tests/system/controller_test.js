/*globals TestApp*/

module("Ember.Controller#connectOutlet", {
  setup: function() {
    window.TestApp = Ember.Application.create();

    TestApp.ApplicationController = Ember.Controller.extend();

    TestApp.PostController = Ember.Controller.extend();
    TestApp.PostView = Ember.Controller.extend();
  },

  teardown: function() {
    window.TestApp = undefined;
  }
});

test("connectOutlet instantiates a view, controller, and connects them", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });
  var view = appController.connectOutlet(TestApp.PostView);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");
});

test("connectOutlet takes an optional outlet name", function() {
  var postController = Ember.Controller.create();

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });
  var view = appController.connectOutlet('mainView', TestApp.PostView);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
});

test("connectOutlet takes an optional controller context", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });
  var view = appController.connectOutlet(TestApp.PostView, context);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('view'), view, "the app controller's view is set");
  equal(view.getPath('controller.content'), context, "the controller receives the context");
});

test("connectOutlet works if all three parameters are provided", function() {
  var postController = Ember.Controller.create(),
      context = {};

  var appController = TestApp.ApplicationController.create({
    controllers: { postController: postController }
  });
  var view = appController.connectOutlet('mainView', TestApp.PostView, context);

  ok(view instanceof TestApp.PostView, "the view is an instance of PostView");
  equal(view.get('controller'), postController, "the controller is looked up on the parent's controllers hash");
  equal(appController.get('mainView'), view, "the app controller's view is set");
  equal(view.getPath('controller.content'), context, "the controller receives the context");
});


