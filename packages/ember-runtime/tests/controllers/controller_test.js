/* global EmberDev */

import Controller from 'ember-runtime/controllers/controller';
import Service from 'ember-runtime/system/service';
import Mixin from 'ember-metal/mixin';
import Object from 'ember-runtime/system/object';
import inject from 'ember-runtime/inject';
import { get } from 'ember-metal/property_get';
import buildOwner from 'container/tests/test-helpers/build-owner';

QUnit.module('Controller event handling');

QUnit.test('can access `actions` hash via `_actions` [DEPRECATED]', function() {
  expect(2);

  var controller = Controller.extend({
    actions: {
      foo: function() {
        ok(true, 'called foo action');
      }
    }
  }).create();

  expectDeprecation(function() {
    controller._actions.foo();
  }, 'Usage of `_actions` is deprecated, use `actions` instead.');
});

QUnit.test('Action can be handled by a function on actions object', function() {
  expect(1);
  var TestController = Controller.extend({
    actions: {
      poke() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create();
  controller.send('poke');
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
      let owner = buildOwner();

      var AnObject = Object.extend({
        foo: inject.controller('bar')
      });

      owner.register('foo:main', AnObject);

      owner._lookupFactory('foo:main');
    }, /Defining an injected controller property on a non-controller is not allowed./);
  });
}

QUnit.test('controllers can be injected into controllers', function() {
  let owner = buildOwner();

  owner.register('controller:post', Controller.extend({
    postsController: inject.controller('posts')
  }));

  owner.register('controller:posts', Controller.extend());

  var postController = owner.lookup('controller:post');
  var postsController = owner.lookup('controller:posts');

  equal(postsController, postController.get('postsController'), 'controller.posts is injected');
});

QUnit.test('services can be injected into controllers', function() {
  let owner = buildOwner();

  owner.register('controller:application', Controller.extend({
    authService: inject.service('auth')
  }));

  owner.register('service:auth', Service.extend());

  var appController = owner.lookup('controller:application');
  var authService = owner.lookup('service:auth');

  equal(authService, appController.get('authService'), 'service.auth is injected');
});
