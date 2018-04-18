import Controller, { inject as injectController } from '@ember/controller';
import Service, { inject as injectService } from '@ember/service';
import { Object as EmberObject } from 'ember-runtime';
import { Mixin, get } from 'ember-metal';
import { runDestroy, buildOwner } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Controller event handling',
  class extends AbstractTestCase {
    ['@test Action can be handled by a function on actions object'](assert) {
      assert.expect(1);
      let TestController = Controller.extend({
        actions: {
          poke() {
            assert.ok(true, 'poked');
          },
        },
      });
      let controller = TestController.create();
      controller.send('poke');
    }

    ['@test A handled action can be bubbled to the target for continued processing'](assert) {
      assert.expect(2);
      let TestController = Controller.extend({
        actions: {
          poke() {
            assert.ok(true, 'poked 1');
            return true;
          },
        },
      });

      let controller = TestController.create({
        target: Controller.extend({
          actions: {
            poke() {
              assert.ok(true, 'poked 2');
            },
          },
        }).create(),
      });
      controller.send('poke');
    }

    ["@test Action can be handled by a superclass' actions object"](assert) {
      assert.expect(4);

      let SuperController = Controller.extend({
        actions: {
          foo() {
            assert.ok(true, 'foo');
          },
          bar(msg) {
            assert.equal(msg, 'HELLO');
          },
        },
      });

      let BarControllerMixin = Mixin.create({
        actions: {
          bar(msg) {
            assert.equal(msg, 'HELLO');
            this._super(msg);
          },
        },
      });

      let IndexController = SuperController.extend(BarControllerMixin, {
        actions: {
          baz() {
            assert.ok(true, 'baz');
          },
        },
      });

      let controller = IndexController.create({});
      controller.send('foo');
      controller.send('bar', 'HELLO');
      controller.send('baz');
    }

    ['@test .send asserts if called on a destroyed controller']() {
      let owner = buildOwner();

      owner.register(
        'controller:application',
        Controller.extend({
          toString() {
            return 'controller:rip-alley';
          },
        })
      );

      let controller = owner.lookup('controller:application');
      runDestroy(owner);

      expectAssertion(() => {
        controller.send('trigger-me-dead');
      }, "Attempted to call .send() with the action 'trigger-me-dead' on the destroyed object 'controller:rip-alley'.");
    }
  }
);

moduleFor(
  'Controller deprecations -> Controller Content -> Model Alias',
  class extends AbstractTestCase {
    ['@test `content` is not moved to `model` when `model` is unset'](assert) {
      assert.expect(2);
      let controller;

      ignoreDeprecation(function() {
        controller = Controller.extend({
          content: 'foo-bar',
        }).create();
      });

      assert.notEqual(controller.get('model'), 'foo-bar', 'model is set properly');
      assert.equal(controller.get('content'), 'foo-bar', 'content is not set properly');
    }

    ['@test specifying `content` (without `model` specified) does not result in deprecation'](
      assert
    ) {
      assert.expect(2);
      expectNoDeprecation();

      let controller = Controller.extend({
        content: 'foo-bar',
      }).create();

      assert.equal(get(controller, 'content'), 'foo-bar');
    }

    ['@test specifying `content` (with `model` specified) does not result in deprecation'](assert) {
      assert.expect(3);
      expectNoDeprecation();

      let controller = Controller.extend({
        content: 'foo-bar',
        model: 'blammo',
      }).create();

      assert.equal(get(controller, 'content'), 'foo-bar');
      assert.equal(get(controller, 'model'), 'blammo');
    }
  }
);

moduleFor(
  'Controller deprecations -> Controller injected properties',
  class extends AbstractTestCase {
    ['@test defining a controller on a non-controller should fail assertion']() {
      expectAssertion(function() {
        let owner = buildOwner();

        let AnObject = EmberObject.extend({
          foo: injectController('bar'),
        });

        owner.register('controller:bar', EmberObject.extend());
        owner.register('foo:main', AnObject);

        owner.lookup('foo:main');
      }, /Defining `foo` as an injected controller property on a non-controller \(`foo:main`\) is not allowed/);
    }

    ['@test controllers can be injected into controllers'](assert) {
      let owner = buildOwner();

      owner.register(
        'controller:post',
        Controller.extend({
          postsController: injectController('posts'),
        })
      );

      owner.register('controller:posts', Controller.extend());

      let postController = owner.lookup('controller:post');
      let postsController = owner.lookup('controller:posts');

      assert.equal(
        postsController,
        postController.get('postsController'),
        'controller.posts is injected'
      );
    }

    ['@test services can be injected into controllers'](assert) {
      let owner = buildOwner();

      owner.register(
        'controller:application',
        Controller.extend({
          authService: injectService('auth'),
        })
      );

      owner.register('service:auth', Service.extend());

      let appController = owner.lookup('controller:application');
      let authService = owner.lookup('service:auth');

      assert.equal(authService, appController.get('authService'), 'service.auth is injected');
    }
  }
);
