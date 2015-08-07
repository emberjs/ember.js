/* global EmberDev */

import Controller from 'ember-runtime/controllers/controller';
import Service from 'ember-runtime/system/service';
import Mixin from 'ember-metal/mixin';
import Object from 'ember-runtime/system/object';
import { Registry } from 'ember-runtime/system/container';
import inject from 'ember-runtime/inject';
import { get } from 'ember-metal/property_get';

QUnit.module('Controller event handling');

QUnit.test('Action can be handled by a function on actions object', function() {
  expect(1);
  var TestController = Controller.extend({
    actions: {
      poke() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send('poke');
});

QUnit.test('Controller should have action', function() {
  expect(1);
  var TestController = Controller.extend({
    actions: {
      poke() {}
    }
  });
  var controller = TestController.create({});
  equal(controller.hasAction('poke'), true);
});

QUnit.test('Controller should not have action', function() {
  expect(1);
  var TestController = Controller.extend({
    actions: {
      poke() {}
    }
  });
  var controller = TestController.create({});
  equal(controller.hasAction('another-poke'), false);
});

QUnit.test('method `hasAction` with empty action name should return false', function() {
  expect(1);
  var TestController = Controller.extend({
    actions: {
      poke() {}
    }
  });
  var controller = TestController.create({});
  equal(controller.hasAction(), false);
});

// TODO: Can we support this?
// QUnit.test("Actions handlers can be configured to use another name", function() {
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

QUnit.test('When `_actions` is provided, `actions` is left alone', function() {
  expect(2);
  var TestController = Controller.extend({
    actions: ['foo', 'bar'],
    _actions: {
      poke() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send('poke');
  equal('foo', controller.get('actions')[0], 'actions property is not untouched');
});

QUnit.test('A handled action can be bubbled to the target for continued processing', function() {
  expect(2);
  var TestController = Controller.extend({
    actions: {
      poke() {
        ok(true, 'poked 1');
        return true;
      }
    }
  });

  var controller = TestController.create({
    target: Controller.extend({
      actions: {
        poke() {
          ok(true, 'poked 2');
        }
      }
    }).create()
  });
  controller.send('poke');
});

QUnit.test('Action can be handled by a superclass\' actions object', function() {
  expect(4);

  var SuperController = Controller.extend({
    actions: {
      foo() {
        ok(true, 'foo');
      },
      bar(msg) {
        equal(msg, 'HELLO');
      }
    }
  });

  var BarControllerMixin = Mixin.create({
    actions: {
      bar(msg) {
        equal(msg, 'HELLO');
        this._super(msg);
      }
    }
  });

  var IndexController = SuperController.extend(BarControllerMixin, {
    actions: {
      baz() {
        ok(true, 'baz');
      }
    }
  });

  var controller = IndexController.create({});
  controller.send('foo');
  controller.send('bar', 'HELLO');
  controller.send('baz');
});

QUnit.module('Controller deprecations');

QUnit.module('Controller Content -> Model Alias');

QUnit.test('`model` is aliased as `content`', function() {
  expect(1);
  var controller = Controller.extend({
    model: 'foo-bar'
  }).create();

  equal(controller.get('content'), 'foo-bar', 'content is an alias of model');
});

QUnit.test('`content` is moved to `model` when `model` is unset', function() {
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

QUnit.test('specifying `content` (without `model` specified) results in deprecation', function() {
  expect(1);
  var controller;

  expectDeprecation(function() {
    controller = Controller.extend({
      content: 'foo-bar'
    }).create();
  }, 'Do not specify `content` on a Controller, use `model` instead.');
});

QUnit.test('specifying `content` (with `model` specified) does not result in deprecation', function() {
  expect(3);
  expectNoDeprecation();

  var controller = Controller.extend({
    content: 'foo-bar',
    model: 'blammo'
  }).create();

  equal(get(controller, 'content'), 'foo-bar');
  equal(get(controller, 'model'), 'blammo');
});

QUnit.module('Controller injected properties');

if (!EmberDev.runningProdBuild) {
  QUnit.test('defining a controller on a non-controller should fail assertion', function() {
    expectAssertion(function() {
      var registry = new Registry();
      var container = registry.container();

      var AnObject = Object.extend({
        container: container,
        foo: inject.controller('bar')
      });

      registry.register('foo:main', AnObject);

      container.lookupFactory('foo:main');
    }, /Defining an injected controller property on a non-controller is not allowed./);
  });
}

QUnit.test('controllers can be injected into controllers', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:post', Controller.extend({
    postsController: inject.controller('posts')
  }));

  registry.register('controller:posts', Controller.extend());

  var postController = container.lookup('controller:post');
  var postsController = container.lookup('controller:posts');

  equal(postsController, postController.get('postsController'), 'controller.posts is injected');
});

QUnit.test('services can be injected into controllers', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:application', Controller.extend({
    authService: inject.service('auth')
  }));

  registry.register('service:auth', Service.extend());

  var appController = container.lookup('controller:application');
  var authService = container.lookup('service:auth');

  equal(authService, appController.get('authService'), 'service.auth is injected');
});
