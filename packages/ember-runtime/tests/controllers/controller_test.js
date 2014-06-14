import Ember from "ember-metal/core";
import Controller from "ember-runtime/controllers/controller";
import ObjectController from "ember-runtime/controllers/object_controller";
import Mixin from "ember-metal/mixin";

QUnit.module('Controller event handling');

test("Action can be handled by a function on actions object", function() {
  expect(1);
  var TestController = Controller.extend({
    actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send("poke");
});

// TODO: Can we support this?
// test("Actions handlers can be configured to use another name", function() {
//   expect(1);
//   var TestController = Controller.extend({
//     actionsProperty: 'actionHandlers',
//     actionHandlers: {
//       poke: function() {
//         ok(true, 'poked');
//       }
//     }
//   });
//   var controller = TestController.create({});
//   controller.send("poke");
// });

test("When `_actions` is provided, `actions` is left alone", function() {
  expect(2);
  var TestController = Controller.extend({
    actions: ['foo', 'bar'],
    _actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send("poke");
  equal('foo', controller.get("actions")[0], 'actions property is not untouched');
});

test("Actions object doesn't shadow a proxied object's 'actions' property", function() {
  var TestController = ObjectController.extend({
    model: {
      actions: 'foo'
    },
    actions: {
      poke: function() {
        console.log('ouch');
      }
    }
  });
  var controller = TestController.create({});
  equal(controller.get("actions"), 'foo', "doesn't shadow the content's actions property");
});

test("A handled action can be bubbled to the target for continued processing", function() {
  expect(2);
  var TestController = Controller.extend({
    actions: {
      poke: function() {
        ok(true, 'poked 1');
        return true;
      }
    }
  });

  var controller = TestController.create({
    target: Controller.extend({
      actions: {
        poke: function() {
          ok(true, 'poked 2');
        }
      }
    }).create()
  });
  controller.send("poke");
});

test("Action can be handled by a superclass' actions object", function() {
  expect(4);

  var SuperController = Controller.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  var BarControllerMixin = Mixin.create({
    actions: {
      bar: function(msg) {
        equal(msg, "HELLO");
        this._super(msg);
      }
    }
  });

  var IndexController = SuperController.extend(BarControllerMixin, {
    actions: {
      baz: function() {
        ok(true, 'baz');
      }
    }
  });

  var controller = IndexController.create({});
  controller.send("foo");
  controller.send("bar", "HELLO");
  controller.send("baz");
});

QUnit.module('Controller deprecations');

if (!Ember.FEATURES.isEnabled('ember-routing-drop-deprecated-action-style')) {
  test("Action can be handled by method directly on controller (DEPRECATED)", function() {
    expectDeprecation(/Action handlers implemented directly on controllers are deprecated/);
    var TestController = Controller.extend({
      poke: function() {
        ok(true, 'poked');
      }
    });
    var controller = TestController.create({});
    controller.send("poke");
  });
}

QUnit.module('Controller Content -> Model Alias');

test("`model` is aliased as `content`", function() {
  expect(1);
  var controller = Controller.extend({
    model: 'foo-bar'
  }).create();

  equal(controller.get('content'), 'foo-bar', 'content is an alias of model');
});

test("`content` is moved to `model` when `model` is unset", function() {
  expect(2);
  var controller;

  ignoreDeprecation(function() {
    controller = Controller.extend({
      content: 'foo-bar'
    }).create();
  });

  equal(controller.get('model'), 'foo-bar', 'model is set properly');
  equal(controller.get('content'), 'foo-bar', 'content is set properly');
});

test("specifying `content` (without `model` specified) results in deprecation", function() {
  expect(1);
  var controller;

  expectDeprecation(function() {
    controller = Controller.extend({
      content: 'foo-bar'
    }).create();
  }, 'Do not specify `content` on a Controller, use `model` instead.');
});

test("specifying `content` (with `model` specified) does not result in deprecation", function() {
  expect(1);
  expectNoDeprecation();

  Controller.extend({
    content: 'foo-bar',
    model: 'blammo'
  }).create();
});
