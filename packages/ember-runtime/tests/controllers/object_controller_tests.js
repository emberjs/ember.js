module("Ember.ObjectController");


test("should be able to set the target property of an ObjectController", function() {
  var controller = Ember.ObjectController.create();
  var target = {};

  controller.set('target', target);
  equal(controller.get('target'), target, "able to set the target property");
});
