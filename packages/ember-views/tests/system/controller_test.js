var originalLookup = Ember.lookup, TestApp, lookup;

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
