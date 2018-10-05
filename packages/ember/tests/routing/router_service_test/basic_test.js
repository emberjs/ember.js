import { Route, NoneLocation } from '@ember/-internals/routing';
import { set } from '@ember/-internals/metal';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import { EMBER_ROUTING_ROUTER_SERVICE } from '@ember/canary-features';

moduleFor(
  'Router Service - main',
  class extends RouterTestCase {
    ['@test RouterService#currentRouteName is correctly set for top level route'](assert) {
      if (EMBER_ROUTING_ROUTER_SERVICE) {
        assert.expect(6);
      } else {
        assert.expect(1);
      }

      return this.visit('/').then(() => {
        if (EMBER_ROUTING_ROUTER_SERVICE) {
          let currentRoute = this.routerService.currentRoute;
          let { name, localName, params, paramNames, queryParams } = currentRoute;
          assert.equal(name, 'parent.index');
          assert.equal(localName, 'index');
          assert.deepEqual(params, {});
          assert.deepEqual(queryParams, {});
          assert.deepEqual(paramNames, []);
        }

        assert.equal(this.routerService.get('currentRouteName'), 'parent.index');
      });
    }

    ['@test RouterService#currentRouteName is correctly set for child route'](assert) {
      if (EMBER_ROUTING_ROUTER_SERVICE) {
        assert.expect(6);
      } else {
        assert.expect(1);
      }

      return this.visit('/child').then(() => {
        if (EMBER_ROUTING_ROUTER_SERVICE) {
          let currentRoute = this.routerService.currentRoute;
          let { name, localName, params, paramNames, queryParams } = currentRoute;
          assert.equal(name, 'parent.child');
          assert.equal(localName, 'child');
          assert.deepEqual(params, {});
          assert.deepEqual(queryParams, {});
          assert.deepEqual(paramNames, []);
        }

        assert.equal(this.routerService.get('currentRouteName'), 'parent.child');
      });
    }

    ['@test RouterService#currentRouteName is correctly set after transition'](assert) {
      if (EMBER_ROUTING_ROUTER_SERVICE) {
        assert.expect(5);
      } else {
        assert.expect(1);
      }

      return this.visit('/child')
        .then(() => {
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            let currentRoute = this.routerService.currentRoute;
            let { name, localName } = currentRoute;
            assert.equal(name, 'parent.child');
            assert.equal(localName, 'child');
          }

          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            let currentRoute = this.routerService.currentRoute;
            let { name, localName } = currentRoute;
            assert.equal(name, 'parent.sister');
            assert.equal(localName, 'sister');
          }
          assert.equal(this.routerService.get('currentRouteName'), 'parent.sister');
        });
    }

    ['@test RouterService#currentRouteName is correctly set on each transition'](assert) {
      if (EMBER_ROUTING_ROUTER_SERVICE) {
        assert.expect(9);
      } else {
        assert.expect(3);
      }

      return this.visit('/child')
        .then(() => {
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            let currentRoute = this.routerService.currentRoute;
            let { name, localName } = currentRoute;
            assert.equal(name, 'parent.child');
            assert.equal(localName, 'child');
          }
          assert.equal(this.routerService.get('currentRouteName'), 'parent.child');

          return this.visit('/sister');
        })
        .then(() => {
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            let currentRoute = this.routerService.currentRoute;
            let { name, localName } = currentRoute;
            assert.equal(name, 'parent.sister');
            assert.equal(localName, 'sister');
          }
          assert.equal(this.routerService.get('currentRouteName'), 'parent.sister');

          return this.visit('/brother');
        })
        .then(() => {
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            let currentRoute = this.routerService.currentRoute;
            let { name, localName } = currentRoute;
            assert.equal(name, 'parent.brother');
            assert.equal(localName, 'brother');
          }
          assert.equal(this.routerService.get('currentRouteName'), 'parent.brother');
        });
    }

    ['@test RouterService#rootURL is correctly set to the default value'](assert) {
      assert.expect(1);

      return this.visit('/').then(() => {
        assert.equal(this.routerService.get('rootURL'), '/');
      });
    }

    ['@test RouterService#rootURL is correctly set to a custom value'](assert) {
      assert.expect(1);

      this.add(
        'route:parent.index',
        Route.extend({
          init() {
            this._super();
            set(this._router, 'rootURL', '/homepage');
          },
        })
      );

      return this.visit('/').then(() => {
        assert.equal(this.routerService.get('rootURL'), '/homepage');
      });
    }

    ['@test RouterService#location is correctly delegated from router:main'](assert) {
      assert.expect(2);

      return this.visit('/').then(() => {
        let location = this.routerService.get('location');
        assert.ok(location);
        assert.ok(location instanceof NoneLocation);
      });
    }
  }
);
