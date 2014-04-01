import Ember from 'ember-metal/core';
import MutableArrayTests from 'ember-runtime/tests/suites/mutable_array';
import ArrayController from "ember-runtime/controllers/array_controller";

module("ember-runtime/controllers/array_controller_test");

MutableArrayTests.extend({
  name: 'Ember.ArrayController',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return ArrayController.create({
      content: Ember.A(ret)
    });
  },

  mutate: function(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}).run();

test("defaults it's `content` to an empty array", function () {
  var Controller = ArrayController.extend();
  deepEqual(Controller.create().get("content"), [], "`ArrayController` defaults it's content to an empty array");
  equal(Controller.create().get('firstObject'), undefined, 'can fetch firstObject');
  equal(Controller.create().get('lastObject'), undefined, 'can fetch lastObject');
});


test("Ember.ArrayController length property works even if content was not set initially", function() {
  var controller = ArrayController.create();
  controller.pushObject('item');
  equal(controller.get('length'), 1);
});
