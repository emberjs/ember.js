import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import { EMBER_ROUTING_ROUTER_SERVICE } from '@ember/canary-features';

if (EMBER_ROUTING_ROUTER_SERVICE) {
  moduleFor(
    'Deprecated Transition State',
    class extends RouterTestCase {
      '@test touching transition.state is deprecated'(assert) {
        assert.expect(1);
        return this.visit('/').then(() => {
          this.routerService.on('routeWillChange', transition => {
            expectDeprecation(() => {
              transition.state;
            }, 'You attempted to read "transition.state" which is a private API. You should read the `RouteInfo` object on "transition.to" or "transition.from" which has the public state on it.');
          });
          return this.routerService.transitionTo('/child');
        });
      }

      '@test touching transition.queryParams is deprecated'(assert) {
        assert.expect(1);
        return this.visit('/').then(() => {
          this.routerService.on('routeWillChange', transition => {
            expectDeprecation(() => {
              transition.queryParams;
            }, 'You attempted to read "transition.queryParams" which is a private API. You should read the `RouteInfo` object on "transition.to" or "transition.from" which has the queryParams on it.');
          });
          return this.routerService.transitionTo('/child');
        });
      }

      '@test touching transition.params is deprecated'(assert) {
        assert.expect(1);
        return this.visit('/').then(() => {
          this.routerService.on('routeWillChange', transition => {
            expectDeprecation(() => {
              transition.params;
            }, 'You attempted to read "transition.params" which is a private API. You should read the `RouteInfo` object on "transition.to" or "transition.from" which has the params on it.');
          });
          return this.routerService.transitionTo('/child');
        });
      }
    }
  );
}
