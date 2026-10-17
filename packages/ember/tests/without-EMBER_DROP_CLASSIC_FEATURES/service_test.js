import Service, { service } from '@ember/service';
import EmberObject from '@ember/object';
import { getOwner } from '@ember/owner';
import { precompileTemplate } from '@ember/template-compilation';
import {
  AbstractTestCase,
  ApplicationTestCase,
  buildOwner,
  moduleFor,
  runDestroy,
} from 'internal-test-helpers';

/*
  The classic `Service` API, which the `EMBER_DROP_CLASSIC_FEATURES` build
  flag removes. These tests run only in builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: Service',
    class extends AbstractTestCase {
      ['@test Service extends EmberObject'](assert) {
        let owner = buildOwner();

        owner.register('service:main', class extends Service {});

        let main = owner.lookup('service:main');

        assert.ok(main instanceof Service);
        assert.ok(main instanceof EmberObject);

        runDestroy(owner);
      }

      ['@test init runs with the owner set'](assert) {
        let owner = buildOwner();

        owner.register(
          'service:main',
          class extends Service {
            init() {
              super.init(...arguments);
              assert.step('init');
              assert.strictEqual(getOwner(this), owner, 'the owner is set in init');
            }
          }
        );

        owner.lookup('service:main');

        assert.verifySteps(['init']);

        runDestroy(owner);
      }

      ['@test Service.extend defines a service'](assert) {
        let owner = buildOwner();

        owner.register('service:session', class extends Service {});
        owner.register(
          'service:main',
          Service.extend({
            session: service(),
            name: 'main',

            greet() {
              return `hello from ${this.name}`;
            },
          })
        );

        let main = owner.lookup('service:main');

        assert.strictEqual(main.greet(), 'hello from main');
        assert.strictEqual(main.session, owner.lookup('service:session'));

        runDestroy(owner);
      }

      ['@test create assigns properties'](assert) {
        let owner = buildOwner();

        owner.register('service:main', class extends Service {});

        let main = owner.factoryFor('service:main').create({ name: 'main' });

        assert.strictEqual(main.name, 'main');

        runDestroy(main);
        runDestroy(owner);
      }

      ['@test get and set are methods of the service'](assert) {
        let owner = buildOwner();

        owner.register(
          'service:main',
          class extends Service {
            name = 'main';
          }
        );

        let main = owner.lookup('service:main');

        assert.strictEqual(main.get('name'), 'main');

        main.set('name', 'renamed');

        assert.strictEqual(main.name, 'renamed');

        runDestroy(owner);
      }

      ['@test willDestroy runs and the destroy flags are set when the owner is destroyed'](assert) {
        let owner = buildOwner();

        owner.register(
          'service:main',
          class extends Service {
            willDestroy() {
              super.willDestroy(...arguments);
              assert.step('willDestroy');
            }
          }
        );

        let main = owner.lookup('service:main');

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
    'without EMBER_DROP_CLASSIC_FEATURES: RouterService',
    class extends ApplicationTestCase {
      async ['@test get reads the properties of the router service'](assert) {
        this.add('template:application', precompileTemplate(''));

        await this.visit('/');

        let routerService = this.applicationInstance.lookup('service:router');

        assert.strictEqual(routerService.get('currentURL'), '/');
        assert.strictEqual(routerService.get('currentRouteName'), 'index');
        assert.strictEqual(routerService.get('currentRoute.name'), 'index');
      }
    }
  );
}
