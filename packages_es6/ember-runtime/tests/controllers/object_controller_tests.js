import ObjectController from "ember-runtime/controllers/object_controller";

module("Ember.ObjectController");


test("should be able to set the target property of an ObjectController", function() {
  var controller = ObjectController.create();
  var target = {};

  controller.set('target', target);
  equal(controller.get('target'), target, "able to set the target property");
});
