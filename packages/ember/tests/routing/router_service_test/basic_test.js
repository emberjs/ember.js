import { inject } from 'ember-runtime';
import { Component } from 'ember-glimmer';
import { Route, NoneLocation } from 'ember-routing';
import {
  get,
  set
} from 'ember-metal';
import {
  RouterTestCase,
  moduleFor
} from 'internal-test-helpers';

import { EMBER_ROUTING_ROUTER_SERVICE } from 'ember/features';

if (EMBER_ROUTING_ROUTER_SERVICE) {
  moduleFor('Router Service - main', class extends RouterTestCase {
    ['@test RouterService#currentRouteName is correctly set for top level route'](assert) {
      assert.expect(1);

      return this.visit('/').then(() => {
        assert.equal(this.routerService.get('currentRouteName'), 'parent.index');
      });
    }

    ['@test RouterService#currentRouteName is correctly set for child route'](assert) {
      assert.expect(1);

      return this.visit('/child').then(() => {
        assert.equal(this.routerService.get('currentRouteName'), 'parent.child');
      });
    }

    ['@test RouterService#currentRouteName is correctly set after transition'](assert) {
      assert.expect(1);

      return this.visit('/child')
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          assert.equal(this.routerService.get('currentRouteName'), 'parent.sister');
        });
    }

    ['@test RouterService#currentRouteName is correctly set on each transition'](assert) {
      assert.expect(3);

      return this.visit('/child')
        .then(() => {
          assert.equal(this.routerService.get('currentRouteName'), 'parent.child');

          return this.visit('/sister');
        })
        .then(() => {
          assert.equal(this.routerService.get('currentRouteName'), 'parent.sister');

          return this.visit('/brother');
        })
        .then(() => {
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

      this.add('route:parent.index', Route.extend({
        init() {
          this._super();
          set(this.router, 'rootURL', '/homepage');
        }
      }));

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

    ['@test RouterService#queryParams are correctly set'](assert) {
      assert.expect(2);

      return this.visit('/?qp1=param1&qp2=param2').then(() => {
        let queryParams = this.routerService.get('queryParams');
        assert.deepEqual(queryParams, { qp1: "param1", qp2: "param2" });
      }).then(() => {
        this.visit('/child?qp1=param2&qp3=param3').then(() => {
          let queryParams = this.routerService.get('queryParams');
          assert.deepEqual(queryParams, { qp1: "param2", qp3: "param3" });
        });
      });
    }

    ['@test RouterService#params are correctly set'](assert) {
      assert.expect(2);

      this.add('route:dynamic', Route.extend({ model() {} }));

      return this.visit('dynamic/1').then(() => {
        let params = this.routerService.get('params');
        assert.deepEqual(params, { "application": {}, "dynamic": { "dynamic_id": "1" } });
      }).then(() => {
        this.visit('dynamic/2').then(() => {
          let params = this.routerService.get('params');
          assert.deepEqual(params, { "application": {}, "dynamic": { "dynamic_id": "2" } });
        });
      });
    }

    ['@test RouterService#currentRouteParams are correctly set'](assert) {
      assert.expect(2);

      this.add('route:dynamic', Route.extend({ model() {} }));

      return this.visit('dynamic/1').then(() => {
        let currentRouteParams = this.routerService.get('currentRouteParams');
        assert.deepEqual(currentRouteParams, { "dynamic_id": "1" });
      }).then(() => {
        this.visit('dynamic/2').then(() => {
          let currentRouteParams = this.routerService.get('currentRouteParams');
          assert.deepEqual(currentRouteParams, { "dynamic_id": "2" });
        });
      });
    }
  });
}
