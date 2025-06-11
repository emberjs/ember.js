import Controller, { inject as injectController } from '@ember/controller';
import Service, { service } from '@ember/service';
import EmberObject, { get } from '@ember/object';
import { runDestroy, buildOwner } from 'internal-test-helpers';
import { moduleFor, ApplicationTestCase, AbstractTestCase, runTask } from 'internal-test-helpers';
import { action } from '@ember/object';

moduleFor(
  'Controller model',
  class extends ApplicationTestCase {
    async '@test model is tracked'() {
      this.add(
        'controller:index',
        class extends Controller {
          constructor() {
            super(...arguments);
            this.model = 0;
          }

          get derived() {
            return this.model + 1;
          }

          @action
          update() {
            this.model++;
          }
        }
      );

      this.addTemplate('index', '<button {{on "click" this.update}}>{{this.derived}}</button>');

      await this.visit('/');

      this.assertText('1');

      runTask(() => this.$('button').click());
      this.assertText('2');
    }

    async '@test model can be observed with sync observers'(assert) {
      let observerRunCount = 0;

      this.add(
        'controller:index',
        class extends Controller {
          constructor() {
            super(...arguments);
            this.model = 0;

            this.addObserver('model', this, () => observerRunCount++, true);
          }

          @action
          update() {
            this.model++;
          }
        }
      );

      this.addTemplate('index', '<button {{on "click" this.update}}>{{this.model}}</button>');

      await this.visit('/');
      runTask(() => this.$('button').click());
      assert.equal(observerRunCount, 1, 'observer ran exactly once');
    }
  }
);

moduleFor(
  'Controller deprecations -> Controller Content -> Model Alias',
  class extends AbstractTestCase {
    ['@test `content` is not moved to `model` when `model` is unset'](assert) {
      assert.expect(2);
      let controller;

      ignoreDeprecation(function () {
        controller = class extends Controller {
          content = 'foo-bar';
        }.create();
      });

      assert.notEqual(controller.get('model'), 'foo-bar', 'model is set properly');
      assert.equal(controller.get('content'), 'foo-bar', 'content is not set properly');
    }

    ['@test specifying `content` (without `model` specified) does not result in deprecation'](
      assert
    ) {
      assert.expect(2);
      expectNoDeprecation();

      let controller = class extends Controller {
        content = 'foo-bar';
      }.create();

      assert.equal(get(controller, 'content'), 'foo-bar');
    }

    ['@test specifying `content` (with `model` specified) does not result in deprecation'](assert) {
      assert.expect(3);
      expectNoDeprecation();

      let controller = class extends Controller {
        content = 'foo-bar';
        model = 'blammo';
      }.create();

      assert.equal(get(controller, 'content'), 'foo-bar');
      assert.equal(get(controller, 'model'), 'blammo');
    }
  }
);

moduleFor(
  'Controller deprecations -> Controller injected properties',
  class extends AbstractTestCase {
    ['@test defining a controller on a non-controller should fail assertion']() {
      let owner = buildOwner();

      expectAssertion(function () {
        let AnObject = class extends EmberObject {
          @injectController('bar')
          foo;
        };

        owner.register('controller:bar', class extends EmberObject {});
        owner.register('foo:main', AnObject);

        owner.lookup('foo:main');
      }, /Defining `foo` as an injected controller property on a non-controller \(`foo:main`\) is not allowed/);

      runDestroy(owner);
    }

    ['@test controllers can be injected into controllers'](assert) {
      let owner = buildOwner();

      owner.register(
        'controller:post',
        class extends Controller {
          @injectController('posts')
          postsController;
        }
      );

      owner.register('controller:posts', class extends Controller {});

      let postController = owner.lookup('controller:post');
      let postsController = owner.lookup('controller:posts');

      assert.equal(
        postsController,
        postController.get('postsController'),
        'controller.posts is injected'
      );

      runDestroy(owner);
    }

    ['@test services can be injected into controllers'](assert) {
      let owner = buildOwner();

      owner.register(
        'controller:application',
        class extends Controller {
          @service('auth')
          authService;
        }
      );

      owner.register('service:auth', class extends Service {});

      let appController = owner.lookup('controller:application');
      let authService = owner.lookup('service:auth');

      assert.equal(authService, appController.get('authService'), 'service.auth is injected');

      runDestroy(owner);
    }
  }
);

moduleFor(
  'Controller Injections',
  class extends AbstractTestCase {
    ['@test works with native decorators'](assert) {
      let owner = buildOwner();

      class MainController extends Controller {}

      class IndexController extends Controller {
        @injectController('main') main;
      }

      owner.register('controller:main', MainController);
      owner.register('controller:index', IndexController);

      let index = owner.lookup('controller:index');

      assert.ok(index.main instanceof Controller, 'controller injected correctly');

      runDestroy(owner);
    }

    ['@test uses the decorated property key if not provided'](assert) {
      let owner = buildOwner();

      class MainController extends Controller {}

      class IndexController extends Controller {
        @injectController main;
      }

      owner.register('controller:main', MainController);
      owner.register('controller:index', IndexController);

      let index = owner.lookup('controller:index');

      assert.ok(index.main instanceof Controller, 'controller injected correctly');

      runDestroy(owner);
    }
  }
);
