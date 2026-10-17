import Controller from '@ember/controller';
import EmberObject from '@ember/object';
import { getOwner } from '@ember/owner';
import { isDestroyed } from '@ember/destroyable';
import Route from '@ember/routing/route';
import { precompileTemplate } from '@ember/template-compilation';
import {
  AbstractTestCase,
  QueryParamTestCase,
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
    'EMBER_DROP_CLASSIC_FEATURES build flag: Controller',
    class extends AbstractTestCase {
      ['@test the base class of Controller extends no other class'](assert) {
        let Base = Object.getPrototypeOf(Controller);

        assert.strictEqual(Object.getPrototypeOf(Base), Function.prototype);
        assert.strictEqual(Object.getPrototypeOf(Base.prototype), Object.prototype);
        assert.notOk(Controller.prototype instanceof EmberObject);
      }

      ['@test the owner passes itself to the constructor'](assert) {
        let owner = buildOwner();
        let router = {};

        owner.register('router:main', router, { instantiate: false });

        class MainController extends Controller {
          constructor(owner) {
            super(owner);
            assert.step('constructor');
            assert.strictEqual(getOwner(this), owner, 'the owner is set in the constructor');
          }
        }

        owner.register('controller:main', MainController);

        let main = owner.lookup('controller:main');

        assert.verifySteps(['constructor']);
        assert.ok(main instanceof MainController);
        assert.notOk(main instanceof EmberObject);
        assert.true(main.isController);
        assert.strictEqual(main.target, router, 'the target is the router');
        assert.strictEqual(owner.lookup('controller:main'), main, 'the controller is a singleton');

        runDestroy(owner);
      }

      ['@test willDestroy runs once when the owner is destroyed'](assert) {
        let owner = buildOwner();

        class BaseController extends Controller {
          willDestroy() {
            super.willDestroy(...arguments);
            assert.step('base willDestroy');
          }
        }

        class MainController extends BaseController {
          willDestroy() {
            super.willDestroy(...arguments);
            assert.step('willDestroy');
          }
        }

        owner.register('controller:main', MainController);

        let main = owner.lookup('controller:main');

        assert.verifySteps([]);

        runDestroy(owner);

        assert.verifySteps(['base willDestroy', 'willDestroy']);
        assert.true(isDestroyed(main));
      }

      ['@test willDestroy runs once when destroy is called before the owner is destroyed'](assert) {
        let owner = buildOwner();

        class MainController extends Controller {
          willDestroy() {
            assert.step('willDestroy');
          }
        }

        owner.register('controller:main', MainController);

        let main = owner.lookup('controller:main');

        runTask(() => main.destroy());

        assert.verifySteps(['willDestroy']);
        assert.true(isDestroyed(main));

        runDestroy(owner);

        assert.verifySteps([]);
      }

      ['@test a controller without willDestroy is destroyed with its owner'](assert) {
        let owner = buildOwner();

        owner.register('controller:main', class extends Controller {});

        let main = owner.lookup('controller:main');

        runDestroy(owner);

        assert.true(isDestroyed(main));
      }
    }
  );

  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: Controller in the router',
    class extends QueryParamTestCase {
      async ['@test the route sets the model'](assert) {
        this.add(
          'route:index',
          class extends Route {
            model() {
              return { name: 'Tomster' };
            }
          }
        );
        this.add('controller:index', class extends Controller {});
        this.add('template:index', precompileTemplate('{{this.model.name}}'));

        await this.visit('/');

        this.assertText('Tomster');

        let controller = this.getController('index');

        runTask(() => {
          controller.model = { name: 'Zoey' };
        });

        this.assertText('Zoey');
        assert.notOk(controller instanceof EmberObject);
      }

      async ['@test query params sync between the controller and the URL'](assert) {
        this.add(
          'controller:index',
          class extends Controller {
            queryParams = ['page'];
            page = 1;
          }
        );
        this.add('template:index', precompileTemplate('{{this.page}}'));

        await this.visitAndAssert('/?page=3');

        let controller = this.getController('index');

        assert.strictEqual(controller.page, 3, 'the URL sets the property');
        this.assertText('3');

        await this.setAndFlush(controller, 'page', 4);

        this.assertCurrentPath('/?page=4', 'the property sets the URL');
        this.assertText('4');

        await this.setAndFlush(controller, 'page', 1);

        this.assertCurrentPath('/', 'the default value leaves the URL');
      }
    }
  );
}
