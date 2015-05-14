import Ember from 'ember-metal/core';
import MutableArrayTests from 'ember-runtime/tests/suites/mutable_array';
import ArrayController from "ember-runtime/controllers/array_controller";
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';

QUnit.module("ember-runtime/controllers/array_controller_test");

MutableArrayTests.extend({
  name: 'Ember.ArrayController',

  newObject(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return ArrayController.create({
      model: Ember.A(ret)
    });
  },

  mutate(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}).run();

QUnit.module("ember-runtime: array_controller");

QUnit.test("defaults its `model` to an empty array", function () {
  var Controller = ArrayController.extend();
  deepEqual(Controller.create().get("model"), [], "`ArrayController` defaults its model to an empty array");
  equal(Controller.create().get('firstObject'), undefined, 'can fetch firstObject');
  equal(Controller.create().get('lastObject'), undefined, 'can fetch lastObject');
});

QUnit.test("Ember.ArrayController length property works even if model was not set initially", function() {
  var controller = ArrayController.create();
  controller.pushObject('item');
  equal(controller.get('length'), 1);
});

QUnit.test('works properly when model is set to an Ember.A()', function() {
  var controller = ArrayController.create();

  set(controller, 'model', Ember.A(['red', 'green']));

  deepEqual(get(controller, 'model'), ['red', 'green'], "can set model as an Ember.Array");
});

QUnit.test('works properly when model is set to a plain array', function() {
  var controller = ArrayController.create();

  if (Ember.EXTEND_PROTOTYPES) {
    set(controller, 'model', ['red', 'green']);

    deepEqual(get(controller, 'model'), ['red', 'green'], "can set model as a plain array");
  } else {
    expectAssertion(function() {
      set(controller, 'model', ['red', 'green']);
    }, /ArrayController expects `model` to implement the Ember.Array mixin. This can often be fixed by wrapping your model with `Ember\.A\(\)`./);
  }
});

QUnit.test('works properly when model is set to `null`', function() {
  var controller = ArrayController.create();

  set(controller, 'model', null);
  equal(get(controller, 'model'), null, "can set model to `null`");

  set(controller, 'model', undefined);
  equal(get(controller, 'model'), undefined, "can set model to `undefined`");

  set(controller, 'model', false);
  equal(get(controller, 'model'), false, "can set model to `undefined`");
});
