import Controller from "ember-runtime/controllers/controller";
import Service from "ember-runtime/system/service";
import ObjectController from "ember-runtime/controllers/object_controller";
import Mixin from "ember-metal/mixin";
import Object from "ember-runtime/system/object";
import Container from "ember-runtime/system/container";
import inject from "ember-runtime/inject";
import { get } from "ember-metal/property_get";

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
  expect(3);
  expectNoDeprecation();

  var controller = Controller.extend({
    content: 'foo-bar',
    model: 'blammo'
  }).create();

  equal(get(controller, 'content'), 'foo-bar');
  equal(get(controller, 'model'), 'blammo');
});

if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
  QUnit.module('Controller injected properties');

  test("defining a controller on a non-controller should fail assertion", function(){
    expectAssertion(function() {
      var AnObject = Object.extend({
        foo: inject.controller('bar')
      });

      // Prototype chains are lazy, make sure it's evaluated
      AnObject.proto();
    }, /Defining an injected controller property on a non-controller is not allowed./);
  });

  test("controllers can be injected into controllers", function() {
    var container = new Container();

    container.register('controller:post', Controller.extend({
      postsController: inject.controller('posts')
    }));

    container.register('controller:posts', Controller.extend());

    var postController = container.lookup('controller:post'),
      postsController = container.lookup('controller:posts');

    equal(postsController, postController.get('postsController'), "controller.posts is injected");
  });

  test("services can be injected into controllers", function() {
    var container = new Container();

    container.register('controller:application', Controller.extend({
      authService: inject.service('auth')
    }));

    container.register('service:auth', Service.extend());

    var appController = container.lookup('controller:application'),
      authService = container.lookup('service:auth');

    equal(authService, appController.get('authService'), "service.auth is injected");
  });
}
