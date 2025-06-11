import Route from '@ember/routing/route';
import NoneLocation from '@ember/routing/none-location';
import { get, set } from '@ember/object';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import { service } from '@ember/service';

moduleFor(
  'Router Service - main',
  class extends RouterTestCase {
    ['@test RouterService#currentRouteName is correctly set for top level route'](assert) {
      assert.expect(6);

      return this.visit('/').then(() => {
        let currentRoute = this.routerService.currentRoute;
        let { name, localName, params, paramNames, queryParams } = currentRoute;
        assert.equal(name, 'parent.index');
        assert.equal(localName, 'index');
        assert.deepEqual(params, {});
        assert.deepEqual(queryParams, {});
        assert.deepEqual(paramNames, []);

        assert.equal(get(this.routerService, 'currentRouteName'), 'parent.index');
      });
    }

    ['@test RouterService#currentRouteName is correctly set for child route'](assert) {
      assert.expect(6);

      return this.visit('/child').then(() => {
        let currentRoute = this.routerService.currentRoute;
        let { name, localName, params, paramNames, queryParams } = currentRoute;
        assert.equal(name, 'parent.child');
        assert.equal(localName, 'child');
        assert.deepEqual(params, {});
        assert.deepEqual(queryParams, {});
        assert.deepEqual(paramNames, []);

        assert.equal(get(this.routerService, 'currentRouteName'), 'parent.child');
      });
    }

    ['@test RouterService#currentRouteName is correctly set after transition'](assert) {
      assert.expect(5);

      return this.visit('/child')
        .then(() => {
          let currentRoute = this.routerService.currentRoute;
          let { name, localName } = currentRoute;
          assert.equal(name, 'parent.child');
          assert.equal(localName, 'child');

          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          let currentRoute = this.routerService.currentRoute;
          let { name, localName } = currentRoute;
          assert.equal(name, 'parent.sister');
          assert.equal(localName, 'sister');

          assert.equal(get(this.routerService, 'currentRouteName'), 'parent.sister');
        });
    }

    '@test substates survive aborts GH#17430'(assert) {
      assert.expect(2);
      this.add(
        `route:parent.child`,
        class extends Route {
          beforeModel(transition) {
            transition.abort();
            this.intermediateTransitionTo('parent.sister');
          }
        }
      );

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('/child');
        })
        .catch((e) => {
          assert.equal(this.routerService.currentRouteName, 'parent.sister');
          assert.equal(e.message, 'TransitionAborted');
        });
    }

    ['@test RouterService#currentRouteName is correctly set on each transition'](assert) {
      assert.expect(9);

      return this.visit('/child')
        .then(() => {
          let currentRoute = this.routerService.currentRoute;
          let { name, localName } = currentRoute;
          assert.equal(name, 'parent.child');
          assert.equal(localName, 'child');

          assert.equal(get(this.routerService, 'currentRouteName'), 'parent.child');

          return this.visit('/sister');
        })
        .then(() => {
          let currentRoute = this.routerService.currentRoute;
          let { name, localName } = currentRoute;
          assert.equal(name, 'parent.sister');
          assert.equal(localName, 'sister');

          assert.equal(get(this.routerService, 'currentRouteName'), 'parent.sister');

          return this.visit('/brother');
        })
        .then(() => {
          let currentRoute = this.routerService.currentRoute;
          let { name, localName } = currentRoute;
          assert.equal(name, 'parent.brother');
          assert.equal(localName, 'brother');

          assert.equal(get(this.routerService, 'currentRouteName'), 'parent.brother');
        });
    }

    ['@test RouterService#rootURL is correctly set to the default value'](assert) {
      assert.expect(1);

      return this.visit('/').then(() => {
        assert.equal(get(this.routerService, 'rootURL'), '/');
      });
    }

    ['@test RouterService#rootURL is correctly set to a custom value'](assert) {
      assert.expect(1);

      this.add(
        'route:parent.index',
        class extends Route {
          init() {
            super.init();
            set(this._router, 'rootURL', '/homepage');
          }
        }
      );

      return this.visit('/').then(() => {
        assert.equal(get(this.routerService, 'rootURL'), '/homepage');
      });
    }

    ['@test RouterService#location is correctly delegated from router:main'](assert) {
      assert.expect(2);

      return this.visit('/').then(() => {
        let location = get(this.routerService, 'location');
        assert.ok(location);
        assert.ok(location instanceof NoneLocation);
      });
    }
  }
);

moduleFor(
  'Router Service - main',
  class extends RouterTestCase {
    constructor() {
      super();
      this.injectedRouterService = null;
    }

    get routerOptions() {
      let testCase = this;
      return {
        ...super.routerOptions,
        routerService: service('router'),
        init: function () {
          testCase.injectedRouterService = this.routerService;
        },
      };
    }

    async ['@test RouterService can be injected into router and accessed on init'](assert) {
      assert.expect(1);

      await this.visit('/');

      assert.ok(this.injectedRouterService, 'RouterService was injected into router');
    }
  }
);
