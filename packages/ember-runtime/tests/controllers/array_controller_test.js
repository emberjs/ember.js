import Ember from 'ember-metal/core';
import {computed} from "ember-metal/computed";
import MutableArrayTests from 'ember-runtime/tests/suites/mutable_array';
import ArrayController from "ember-runtime/controllers/array_controller";
import ObjectController from "ember-runtime/controllers/object_controller";

QUnit.module("ember-runtime/controllers/array_controller_test");

MutableArrayTests.extend({
  name: 'Ember.ArrayController',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return ArrayController.create({
      model: Ember.A(ret)
    });
  },

  mutate: function(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}).run();

test("defaults its `model` to an empty array", function () {
  var Controller = ArrayController.extend();
  deepEqual(Controller.create().get("model"), [], "`ArrayController` defaults its model to an empty array");
  equal(Controller.create().get('firstObject'), undefined, 'can fetch firstObject');
  equal(Controller.create().get('lastObject'), undefined, 'can fetch lastObject');
});


test("Ember.ArrayController length property works even if model was not set initially", function() {
  var controller = ArrayController.create();
  controller.pushObject('item');
  equal(controller.get('length'), 1);
});

if (Ember.FEATURES.isEnabled("ember-runtime-item-controller-inline-class")) {
  test("Ember.ArrayController can accept a controller class directly as the value for itemController", function() {
    var controller = ArrayController.create({
      itemController: ObjectController.extend({
        expand: computed(function() {
          return this.get('text') + ' is working!';
        }).property('text')
      })
    });

    controller.pushObjects([{
      text: 'itemController'
    }]);

    strictEqual(controller.get('firstObject.expand'), 'itemController is working!');
  });
}
