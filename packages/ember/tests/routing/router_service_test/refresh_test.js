import { Route } from '@ember/-internals/routing';
import { EMBER_ROUTING_ROUTER_SERVICE_REFRESH } from '@ember/canary-features';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';

if (EMBER_ROUTING_ROUTER_SERVICE_REFRESH) {
  moduleFor(
    'Router Service - refresh',
    class extends RouterTestCase {
      async ['@test RouterService#refresh can be used to re-run the model hooks of active routes'](
        assert
      ) {
        let parentCounter = 0;
        this.add(
          'route:parent',
          class extends Route {
            model() {
              ++parentCounter;
            }
          }
        );

        let childCounter = 0;
        this.add(
          'route:parent.child',
          class extends Route {
            model() {
              ++childCounter;
            }
          }
        );

        let sisterCounter = 0;
        this.add(
          'route:parent.sister',
          class extends Route {
            model() {
              ++sisterCounter;
            }
          }
        );

        await this.visit('/');
        assert.strictEqual(parentCounter, 1);
        assert.strictEqual(childCounter, 0);
        assert.strictEqual(sisterCounter, 0);

        await this.routerService.refresh();
        assert.strictEqual(parentCounter, 2);
        assert.strictEqual(childCounter, 0);
        assert.strictEqual(sisterCounter, 0);

        await this.routerService.refresh('application');
        assert.strictEqual(parentCounter, 3);
        assert.strictEqual(childCounter, 0);
        assert.strictEqual(sisterCounter, 0);

        await this.routerService.transitionTo('parent.child');
        assert.strictEqual(parentCounter, 3);
        assert.strictEqual(childCounter, 1);
        assert.strictEqual(sisterCounter, 0);

        await this.routerService.refresh('parent.child');
        assert.strictEqual(parentCounter, 3);
        assert.strictEqual(childCounter, 2);
        assert.strictEqual(sisterCounter, 0);

        await this.routerService.refresh('parent');
        assert.strictEqual(parentCounter, 4);
        assert.strictEqual(childCounter, 3);
        assert.strictEqual(sisterCounter, 0);

        await this.routerService.transitionTo('parent.sister');
        assert.strictEqual(parentCounter, 4);
        assert.strictEqual(childCounter, 3);
        assert.strictEqual(sisterCounter, 1);

        await this.routerService.refresh();
        assert.strictEqual(parentCounter, 5);
        assert.strictEqual(childCounter, 3);
        assert.strictEqual(sisterCounter, 2);
      }

      async ['@test RouterService#refresh verifies that the provided route exists']() {
        await this.visit('/');

        expectAssertion(() => {
          this.routerService.refresh('this-route-does-not-exist');
        }, 'The route "this-route-does-not-exist" was not found');
      }

      async ['@test RouterService#refresh verifies that the provided route is active']() {
        await this.visit('/');

        expectAssertion(() => {
          this.routerService.refresh('parent.child');
        }, 'The route "parent.child" is currently not active');
      }
    }
  );
}
