import ObjectController from "ember-runtime/controllers/object_controller";

QUnit.module("Ember.ObjectController");


test("should be able to set the target property of an ObjectController", function() {
  var controller = ObjectController.create();
  var target = {};

  controller.set('target', target);
  equal(controller.get('target'), target, "able to set the target property");
});

test("should provide a helpful error when setting a value before model has been", function() {
  expect(1);
  var controller = ObjectController.create({
    _debugContainerKey: 'controller:super-duper'
  });

  raises(function() {
    controller.set('zomg-missing-model', 'value');
  }, /Can't set `zomg-missing-model` on `controller:super-duper` because its model was not set. Make sure the model hook in your route is returning a value./);
});
