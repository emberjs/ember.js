import Controller, { inject as injectController } from '@ember/controller';
import EmberObject, { computed } from '@ember/object';
import { getOwner } from '@ember/owner';
import { precompileTemplate } from '@ember/template-compilation';
import {
  AbstractTestCase,
  QueryParamTestCase,
  buildOwner,
  moduleFor,
  runDestroy,
  runLoopSettled,
} from 'internal-test-helpers';

/*
  The classic `Controller` API, which the `EMBER_DROP_CLASSIC_FEATURES` build
  flag removes. These tests run only in builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: Controller',
    class extends AbstractTestCase {
      ['@test Controller extends EmberObject'](assert) {
        let owner = buildOwner();

        owner.register('controller:main', class extends Controller {});

        let main = owner.lookup('controller:main');

        assert.ok(main instanceof Controller);
        assert.ok(main instanceof EmberObject);

        runDestroy(owner);
      }

      ['@test Controller.create works without an owner'](assert) {
        let controller = Controller.create({ name: 'main' });

        assert.strictEqual(controller.name, 'main');

        runDestroy(controller);
      }

      ['@test init runs with the owner set'](assert) {
        let owner = buildOwner();

        owner.register(
          'controller:main',
          class extends Controller {
            init() {
              super.init(...arguments);
              assert.step('init');
              assert.strictEqual(getOwner(this), owner, 'the owner is set in init');
            }
          }
        );

        owner.lookup('controller:main');

        assert.verifySteps(['init']);

        runDestroy(owner);
      }

      ['@test Controller.extend defines a controller'](assert) {
        let owner = buildOwner();

        owner.register('controller:posts', class extends Controller {});
        owner.register(
          'controller:main',
          Controller.extend({
            posts: injectController(),
            name: 'main',

            greeting: computed('name', function () {
              return `hello from ${this.name}`;
            }),
          })
        );

        let main = owner.lookup('controller:main');

        assert.strictEqual(main.greeting, 'hello from main');
        assert.strictEqual(main.posts, owner.lookup('controller:posts'));

        runDestroy(owner);
      }

      ['@test create assigns properties'](assert) {
        let owner = buildOwner();

        owner.register('controller:main', class extends Controller {});

        let main = owner.factoryFor('controller:main').create({ model: 'the model' });

        assert.strictEqual(main.model, 'the model');

        runDestroy(main);
        runDestroy(owner);
      }

      ['@test get, set and toggleProperty are methods of the controller'](assert) {
        let owner = buildOwner();

        owner.register(
          'controller:main',
          class extends Controller {
            name = 'main';
            isExpanded = false;
          }
        );

        let main = owner.lookup('controller:main');

        assert.strictEqual(main.get('name'), 'main');

        main.set('name', 'renamed');
        main.setProperties({ model: 'the model' });
        main.toggleProperty('isExpanded');

        assert.deepEqual(main.getProperties('name', 'model', 'isExpanded'), {
          name: 'renamed',
          model: 'the model',
          isExpanded: true,
        });

        runDestroy(owner);
      }

      ['@test willDestroy runs and the destroy flags are set when the owner is destroyed'](assert) {
        let owner = buildOwner();

        owner.register(
          'controller:main',
          class extends Controller {
            willDestroy() {
              super.willDestroy(...arguments);
              assert.step('willDestroy');
            }
          }
        );

        let main = owner.lookup('controller:main');

        assert.false(main.isDestroying);
        assert.false(main.isDestroyed);

        runDestroy(owner);

        assert.verifySteps(['willDestroy']);
        assert.true(main.isDestroying);
        assert.true(main.isDestroyed);
      }
    }
  );

  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: Controller in the router',
    class extends QueryParamTestCase {
      async ['@test set and get on the controller update the URL and the template'](assert) {
        this.add(
          'controller:index',
          Controller.extend({
            queryParams: ['page'],
            page: 1,
          })
        );
        this.add('template:index', precompileTemplate('{{this.page}}'));

        await this.visitAndAssert('/?page=3');

        let controller = this.getController('index');

        assert.strictEqual(controller.get('page'), 3);

        controller.set('page', 4);
        await runLoopSettled();

        this.assertCurrentPath('/?page=4');
        this.assertText('4');
      }

      async ['@test the query params of a parent class concatenate'](assert) {
        let BaseController = Controller.extend({
          queryParams: ['page'],
          page: 1,
        });

        this.add(
          'controller:index',
          BaseController.extend({
            queryParams: ['sort'],
            sort: 'name',
          })
        );

        await this.visitAndAssert('/?page=2&sort=date');

        let controller = this.getController('index');

        assert.deepEqual(controller.get('queryParams'), ['page', 'sort']);
        assert.deepEqual(controller.getProperties('page', 'sort'), { page: 2, sort: 'date' });
      }
    }
  );
}
