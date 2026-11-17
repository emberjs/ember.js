import Route from '@ember/routing/route';
import EmberObject from '@ember/object';
import { getOwner } from '@ember/owner';
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
  The classic `Route` API, which the `EMBER_DROP_CLASSIC_FEATURES` build flag
  removes. These tests run only in builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: Route',
    class extends AbstractTestCase {
      ['@test Route extends EmberObject'](assert) {
        let owner = buildOwner();

        owner.register('route:index', class extends Route {});

        let route = owner.lookup('route:index');

        assert.ok(route instanceof Route);
        assert.ok(route instanceof EmberObject);

        runDestroy(owner);
      }

      ['@test init runs with the owner set'](assert) {
        let owner = buildOwner();

        owner.register(
          'route:index',
          class extends Route {
            init() {
              super.init(...arguments);
              assert.step('init');
              assert.strictEqual(getOwner(this), owner, 'the owner is set in init');
            }
          }
        );

        owner.lookup('route:index');

        assert.verifySteps(['init']);

        runDestroy(owner);
      }

      ['@test create assigns properties'](assert) {
        let route = Route.create({ routeName: 'posts', controllerName: 'articles' });

        assert.strictEqual(route.routeName, 'posts');
        assert.strictEqual(route.controllerName, 'articles');

        runDestroy(route);
      }

      ['@test Route.extend merges queryParams'](assert) {
        let ParentRoute = Route.extend({
          queryParams: { page: { refreshModel: true } },
        });
        let ChildRoute = ParentRoute.extend({
          queryParams: { sort: { replace: true } },
        });

        let route = ChildRoute.create();

        assert.deepEqual(route.queryParams, {
          page: { refreshModel: true },
          sort: { replace: true },
        });

        runDestroy(route);
      }

      ['@test get and set are methods of the route'](assert) {
        let route = Route.create({ routeName: 'posts' });

        assert.strictEqual(route.get('routeName'), 'posts');

        route.set('routeName', 'comments');

        assert.strictEqual(route.routeName, 'comments');

        runDestroy(route);
      }

      ['@test the destroy method runs willDestroy and sets the destroy flags'](assert) {
        let route = Route.extend({
          willDestroy() {
            this._super(...arguments);
            assert.step('willDestroy');
          },
        }).create();

        assert.false(route.isDestroying);
        assert.false(route.isDestroyed);

        runTask(() => route.destroy());

        assert.verifySteps(['willDestroy']);
        assert.true(route.isDestroying);
        assert.true(route.isDestroyed);
      }
    }
  );

  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: Route in an application',
    class extends ApplicationTestCase {
      async ['@test init runs and _super reaches the hooks of Route'](assert) {
        this.router.map(function () {
          this.route('posts');
        });

        this.add(
          'route:posts',
          Route.extend({
            init() {
              this._super(...arguments);
              assert.step('init');
            },

            model() {
              return { title: 'post' };
            },

            setupController(controller, model) {
              this._super(controller, model);
              assert.step(`setupController ${controller.model.title}`);
            },
          })
        );
        this.add('template:posts', precompileTemplate('{{@model.title}}'));

        await this.visit('/posts');

        assert.verifySteps(['init', 'setupController post']);
        this.assertText('post');
      }
    }
  );
}
