/* global EmberDev */

import Controller from '../../controllers/controller';
import Service from '../../system/service';
import { Mixin, get } from 'ember-metal';
import EmberObject from '../../system/object';
import inject from '../../inject';
import { buildOwner } from 'internal-test-helpers';

QUnit.module('Controller event handling');

QUnit.test('Action can be handled by a function on actions object', function(assert) {
  assert.expect(1);
  let TestController = Controller.extend({
    actions: {
      poke() {
        assert.ok(true, 'poked');
      }
    }
  });
  let controller = TestController.create();
  controller.send('poke');
});

QUnit.test('A handled action can be bubbled to the target for continued processing', function(assert) {
  assert.expect(2);
  let TestController = Controller.extend({
    actions: {
      poke() {
        assert.ok(true, 'poked 1');
        return true;
      }
    }
  });

  let controller = TestController.create({
    target: Controller.extend({
      actions: {
        poke() {
          assert.ok(true, 'poked 2');
        }
      }
    }).create()
  });
  controller.send('poke');
});

QUnit.test('Action can be handled by a superclass\' actions object', function(assert) {
  assert.expect(4);

  let SuperController = Controller.extend({
    actions: {
      foo() {
        assert.ok(true, 'foo');
      },
      bar(msg) {
        assert.equal(msg, 'HELLO');
      }
    }
  });

  let BarControllerMixin = Mixin.create({
    actions: {
      bar(msg) {
        assert.equal(msg, 'HELLO');
        this._super(msg);
      }
    }
  });

  let IndexController = SuperController.extend(BarControllerMixin, {
    actions: {
      baz() {
        assert.ok(true, 'baz');
      }
    }
  });

  let controller = IndexController.create({});
  controller.send('foo');
  controller.send('bar', 'HELLO');
  controller.send('baz');
});

QUnit.module('Controller deprecations');

QUnit.module('Controller Content -> Model Alias');

QUnit.test('`content` is a deprecated alias of `model`', function(assert) {
  assert.expect(2);
  let controller = Controller.extend({
    model: 'foo-bar'
  }).create();

  expectDeprecation(function () {
    assert.equal(controller.get('content'), 'foo-bar', 'content is an alias of model');
  });
});

QUnit.test('`content` is not moved to `model` when `model` is unset', function(assert) {
  assert.expect(2);
  let controller;

  ignoreDeprecation(function() {
    controller = Controller.extend({
      content: 'foo-bar'
    }).create();
  });

  assert.notEqual(controller.get('model'), 'foo-bar', 'model is set properly');
  assert.equal(controller.get('content'), 'foo-bar', 'content is not set properly');
});

QUnit.test('specifying `content` (without `model` specified) does not result in deprecation', function(assert) {
  assert.expect(2);
  expectNoDeprecation();

  let controller = Controller.extend({
    content: 'foo-bar'
  }).create();

  assert.equal(get(controller, 'content'), 'foo-bar');
});

QUnit.test('specifying `content` (with `model` specified) does not result in deprecation', function(assert) {
  assert.expect(3);
  expectNoDeprecation();

  let controller = Controller.extend({
    content: 'foo-bar',
    model: 'blammo'
  }).create();

  assert.equal(get(controller, 'content'), 'foo-bar');
  assert.equal(get(controller, 'model'), 'blammo');
});

QUnit.module('Controller injected properties');

if (!EmberDev.runningProdBuild) {
  QUnit.test('defining a controller on a non-controller should fail assertion', function(assert) {
    expectAssertion(function() {
      let owner = buildOwner();

      let AnObject = EmberObject.extend({
        foo: inject.controller('bar')
      });

      owner.register('controller:bar', EmberObject.extend());
      owner.register('foo:main', AnObject);

      owner.lookup('foo:main');
    }, /Defining an injected controller property on a non-controller is not allowed./);
  });
}

QUnit.test('controllers can be injected into controllers', function(assert) {
  let owner = buildOwner();

  owner.register('controller:post', Controller.extend({
    postsController: inject.controller('posts')
  }));

  owner.register('controller:posts', Controller.extend());

  let postController = owner.lookup('controller:post');
  let postsController = owner.lookup('controller:posts');

  assert.equal(postsController, postController.get('postsController'), 'controller.posts is injected');
});

QUnit.test('services can be injected into controllers', function(assert) {
  let owner = buildOwner();

  owner.register('controller:application', Controller.extend({
    authService: inject.service('auth')
  }));

  owner.register('service:auth', Service.extend());

  let appController = owner.lookup('controller:application');
  let authService = owner.lookup('service:auth');

  assert.equal(authService, appController.get('authService'), 'service.auth is injected');
});
