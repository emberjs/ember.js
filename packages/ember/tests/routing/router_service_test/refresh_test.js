import Route from '@ember/routing/route';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';

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
      assert.equal(parentCounter, 1);
      assert.equal(childCounter, 0);
      assert.equal(sisterCounter, 0);

      await this.routerService.refresh();
      assert.equal(parentCounter, 2);
      assert.equal(childCounter, 0);
      assert.equal(sisterCounter, 0);

      await this.routerService.refresh('application');
      assert.equal(parentCounter, 3);
      assert.equal(childCounter, 0);
      assert.equal(sisterCounter, 0);

      await this.routerService.transitionTo('parent.child');
      assert.equal(parentCounter, 3);
      assert.equal(childCounter, 1);
      assert.equal(sisterCounter, 0);

      await this.routerService.refresh('parent.child');
      assert.equal(parentCounter, 3);
      assert.equal(childCounter, 2);
      assert.equal(sisterCounter, 0);

      await this.routerService.refresh('parent');
      assert.equal(parentCounter, 4);
      assert.equal(childCounter, 3);
      assert.equal(sisterCounter, 0);

      await this.routerService.transitionTo('parent.sister');
      assert.equal(parentCounter, 4);
      assert.equal(childCounter, 3);
      assert.equal(sisterCounter, 1);

      await this.routerService.refresh();
      assert.equal(parentCounter, 5);
      assert.equal(childCounter, 3);
      assert.equal(sisterCounter, 2);
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
