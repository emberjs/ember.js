import ObjectController from "ember-runtime/controllers/object_controller";
import { observer } from 'ember-metal/mixin';

QUnit.module("Ember.ObjectController");

test("should be able to set the target property of an ObjectController", function() {
  var controller = ObjectController.create();
  var target = {};

  controller.set('target', target);
  equal(controller.get('target'), target, "able to set the target property");
});

// See https://github.com/emberjs/ember.js/issues/5112
test("can observe a path on an ObjectController", function() {
  var controller = ObjectController.extend({
    baz: observer('foo.bar', function() {})
  }).create();
  controller.set('model', {});
  ok(true, "should not fail");
});
