import { moduleFor, AutobootApplicationTestCase, runTask } from 'internal-test-helpers';
import Route from '@ember/routing/route';
import Router from '@ember/routing/router';
import { precompileTemplate } from '@ember/template-compilation';
import { getDebugFunction, setDebugFunction } from '@ember/debug';

const originalDebug = getDebugFunction('debug');
const noop = function () {};

moduleFor(
  'Application Lifecycle - route hooks',
  class extends AutobootApplicationTestCase {
    createApplication() {
      let application = super.createApplication(...arguments);
      this.add(
        'router:main',
        class extends Router {
          location = 'none';
        }
      );
      return application;
    }

    constructor() {
      setDebugFunction('debug', noop);
      super();
      let menuItem = (this.menuItem = {});

      runTask(() => {
        this.createApplication();

        let SettingRoute = class extends Route {
          setupController() {
            this.controller.set('selectedMenuItem', menuItem);
          }
          deactivate() {
            this.controller.set('selectedMenuItem', null);
          }
        };
        this.add('route:index', SettingRoute);
        this.add('route:application', SettingRoute);
      });
    }

    teardown() {
      setDebugFunction('debug', originalDebug);
    }

    get indexController() {
      return this.applicationInstance.lookup('controller:index');
    }

    get applicationController() {
      return this.applicationInstance.lookup('controller:application');
    }

    [`@test Resetting the application allows controller properties to be set when a route deactivates`](
      assert
    ) {
      let { indexController, applicationController } = this;
      assert.equal(indexController.get('selectedMenuItem'), this.menuItem);
      assert.equal(applicationController.get('selectedMenuItem'), this.menuItem);

      this.application.reset();

      assert.equal(indexController.get('selectedMenuItem'), null);
      assert.equal(applicationController.get('selectedMenuItem'), null);
    }

    [`@test Destroying the application resets the router before the appInstance is destroyed`](
      assert
    ) {
      let { indexController, applicationController } = this;
      assert.equal(indexController.get('selectedMenuItem'), this.menuItem);
      assert.equal(applicationController.get('selectedMenuItem'), this.menuItem);

      runTask(() => {
        this.application.destroy();
      });

      assert.equal(indexController.get('selectedMenuItem'), null);
      assert.equal(applicationController.get('selectedMenuItem'), null);
    }
  }
);

moduleFor(
  'Application Lifecycle',
  class extends AutobootApplicationTestCase {
    createApplication() {
      let application = super.createApplication(...arguments);
      this.add(
        'router:main',
        class extends Router {
          location = 'none';
        }
      );
      return application;
    }

    [`@test Destroying a route after the router does not re-render the root outlet`](assert) {
      runTask(() => {
        this.createApplication();
        this.add('template:index', precompileTemplate(`Index!`));
        this.add('template:application', precompileTemplate(`Application! {{outlet}}`));
      });

      let router = this.applicationInstance.lookup('router:main');
      let route = this.applicationInstance.lookup('route:index');

      runTask(() => router.destroy());
      assert.equal(router._updatableRootOutletState, null, 'the root outlet state was cleared');

      runTask(() => route.destroy());
      assert.equal(router._updatableRootOutletState, null, 'the root outlet was not re-rendered');

      runTask(() => this.application.destroy());
      assert.equal(router._updatableRootOutletState, null, 'the root outlet was not re-rendered');
    }
  }
);
