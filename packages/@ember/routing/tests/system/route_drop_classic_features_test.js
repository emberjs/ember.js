import Route from '@ember/routing/route';
import Service, { service } from '@ember/service';
import EmberObject from '@ember/object/lib/ember-object';
import { getOwner } from '@ember/owner';
import { isDestroyed } from '@ember/destroyable';
import { precompileTemplate } from '@ember/template-compilation';
import {
  AbstractTestCase,
  ApplicationTestCase,
  buildOwner,
  moduleFor,
  runDestroy,
  runTask,
} from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run these modules.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: Route',
    class extends AbstractTestCase {
      ['@test Route does not extend EmberObject'](assert) {
        let base = Object.getPrototypeOf(Route.prototype);

        assert.strictEqual(Object.getPrototypeOf(base), Object.prototype, 'one private base');
        assert.notOk(Route.create() instanceof EmberObject);
        assert.strictEqual(Route.extend, undefined);
        assert.strictEqual(Route.reopen, undefined);
      }

      ['@test the owner passes itself to the constructor'](assert) {
        let owner = buildOwner();

        class IndexRoute extends Route {
          @service session;

          constructor(owner) {
            super(owner);
            assert.step('constructor');
            assert.strictEqual(getOwner(this), owner, 'the owner is set in the constructor');
          }
        }

        owner.register('service:session', class extends Service {});
        owner.register('route:index', IndexRoute);

        let route = owner.lookup('route:index');

        assert.verifySteps(['constructor']);
        assert.strictEqual(route.session, owner.lookup('service:session'));

        runDestroy(owner);
      }

      ['@test willDestroy runs once when the owner is destroyed'](assert) {
        let owner = buildOwner();

        class IndexRoute extends Route {
          willDestroy() {
            super.willDestroy(...arguments);
            assert.step('willDestroy');
          }
        }

        owner.register('route:index', IndexRoute);

        let route = owner.lookup('route:index');

        assert.verifySteps([]);

        runDestroy(owner);

        assert.verifySteps(['willDestroy']);
        assert.true(isDestroyed(route));
      }

      ['@test willDestroy runs once when destroy is called before the owner is destroyed'](assert) {
        let owner = buildOwner();

        class IndexRoute extends Route {
          willDestroy() {
            super.willDestroy(...arguments);
            assert.step('willDestroy');
          }

          /* The test owner has no running router to render outlets. */
          teardownViews() {
            assert.step('teardownViews');
          }
        }

        owner.register('route:index', IndexRoute);

        let route = owner.lookup('route:index');

        runTask(() => route.destroy());

        assert.verifySteps(['teardownViews', 'willDestroy']);
        assert.true(isDestroyed(route));

        runDestroy(owner);

        assert.verifySteps([]);
      }

      ['@test the willDestroy of Route tears down the views'](assert) {
        let owner = buildOwner();

        class IndexRoute extends Route {
          teardownViews() {
            assert.step('teardownViews');
          }
        }

        owner.register('route:index', IndexRoute);

        let route = owner.lookup('route:index');

        runDestroy(owner);

        assert.verifySteps(['teardownViews']);
        assert.true(isDestroyed(route));
      }
    }
  );

  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: Route in an application',
    class extends ApplicationTestCase {
      async ['@test model hooks, query params and actions work'](assert) {
        this.router.map(function () {
          this.route('posts');
        });

        this.add(
          'route:posts',
          class extends Route {
            queryParams = {
              page: { refreshModel: true },
            };

            model(params) {
              assert.step(`model page=${params.page}`);
              return { page: params.page };
            }

            setupController(controller, model) {
              super.setupController(controller, model);
              assert.step('setupController');
            }
          }
        );
        this.add('template:posts', precompileTemplate('page {{@model.page}}'));

        await this.visit('/posts?page=2');

        assert.verifySteps(['model page=2', 'setupController']);
        this.assertText('page 2');

        await this.visit('/posts?page=3');

        assert.verifySteps(['model page=3', 'setupController']);
        this.assertText('page 3');
      }
    }
  );
}
