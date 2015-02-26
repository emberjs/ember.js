import ObjectController from "ember-runtime/controllers/object_controller";
import {
  objectControllerDeprecation
} from "ember-runtime/controllers/object_controller";
import { observer } from 'ember-metal/mixin';

QUnit.module("Ember.ObjectController");

QUnit.test("should be able to set the target property of an ObjectController", function() {
  expectDeprecation(objectControllerDeprecation);

  var controller = ObjectController.create();
  var target = {};

  controller.set('target', target);
  equal(controller.get('target'), target, "able to set the target property");
});

// See https://github.com/emberjs/ember.js/issues/5112
QUnit.test("can observe a path on an ObjectController", function() {
  expectDeprecation(objectControllerDeprecation);

  var controller = ObjectController.extend({
    baz: observer('foo.bar', function() {})
  }).create();
  controller.set('model', {});
  ok(true, "should not fail");
});

QUnit.test('accessing model properties via proxy behavior results in a deprecation [DEPRECATED]', function() {
  var controller;

  expectDeprecation(function() {
    controller = ObjectController.extend({
      model: {
        foo: 'bar',
        baz: 'qux'
      }
    }).create();
  }, objectControllerDeprecation);

  expectDeprecation(function() {
    controller.get('bar');
  }, /object proxying is deprecated\. Please use `model\.bar` instead\./);
});

QUnit.test('setting model properties via proxy behavior results in a deprecation [DEPRECATED]', function() {
  var controller;

  expectDeprecation(function() {
    controller = ObjectController.extend({
      model: {
        foo: 'bar',
        baz: 'qux'
      }
    }).create();
  }, objectControllerDeprecation);

  expectDeprecation(function() {
    controller.set('bar', 'derp');
  }, /object proxying is deprecated\. Please use `model\.bar` instead\./);
});

QUnit.test('auto-generated controllers are not deprecated', function() {
  expectNoDeprecation(function() {
    ObjectController.extend({
      isGenerated: true
    }).create();
  });
});
