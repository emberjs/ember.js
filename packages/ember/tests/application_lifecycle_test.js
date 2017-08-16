import {
  moduleFor,
  AutobootApplicationTestCase
} from 'internal-test-helpers';
import { Application } from 'ember-application';
import { Route, Router } from 'ember-routing';
import {
  Component,
} from 'ember-glimmer';

moduleFor('Application Lifecycle - route hooks', class extends AutobootApplicationTestCase {

  createApplication() {
    let application = super.createApplication(...arguments);
    this.add('router:main', Router.extend({
      location: 'none'
    }));
    return application;
  }

  constructor() {
    super();
    let menuItem = this.menuItem = {};

    this.runTask(() => {
      this.createApplication();

      let SettingRoute = Route.extend({
        setupController() {
          this.controller.set('selectedMenuItem', menuItem);
        },
        deactivate() {
          this.controller.set('selectedMenuItem', null);
        }
      });
      this.add('route:index', SettingRoute);
      this.add('route:application', SettingRoute);
    });
  }

  get indexController() {
    return this.applicationInstance.lookup('controller:index');
  }

  get applicationController() {
    return this.applicationInstance.lookup('controller:application');
  }

  [`@test Resetting the application allows controller properties to be set when a route deactivates`](assert) {
    let {
      indexController,
      applicationController
    } = this;
    assert.equal(indexController.get('selectedMenuItem'), this.menuItem);
    assert.equal(applicationController.get('selectedMenuItem'), this.menuItem);

    this.application.reset();

    assert.equal(indexController.get('selectedMenuItem'), null);
    assert.equal(applicationController.get('selectedMenuItem'), null);
  }

  [`@test Destroying the application resets the router before the appInstance is destroyed`](assert) {
    let {
      indexController,
      applicationController
    } = this;
    assert.equal(indexController.get('selectedMenuItem'), this.menuItem);
    assert.equal(applicationController.get('selectedMenuItem'), this.menuItem);

    this.runTask(() => {
      this.application.destroy();
    });

    assert.equal(indexController.get('selectedMenuItem'), null);
    assert.equal(applicationController.get('selectedMenuItem'), null);
  }

});

moduleFor('Application Lifecycle', class extends AutobootApplicationTestCase {

  createApplication() {
    let application = super.createApplication(...arguments);
    this.add('router:main', Router.extend({
      location: 'none'
    }));
    return application;
  }

  [`@test Destroying a route after the router does create an undestroyed 'toplevelView'`]() {
    this.runTask(() => {
      this.createApplication();
      this.addTemplate('index', `Index!`);
      this.addTemplate('application', `Application! {{outlet}}`);
    });

    let router = this.applicationInstance.lookup('router:main');
    let route = this.applicationInstance.lookup('route:index');

    this.runTask(() => router.destroy());
    equal(router._toplevelView, null, 'the toplevelView was cleared');

    this.runTask(() => route.destroy());
    equal(router._toplevelView, null, 'the toplevelView was not reinitialized');

    this.runTask(() => this.application.destroy());
    equal(router._toplevelView, null, 'the toplevelView was not reinitialized');
  }

  [`@test initializers can augment an applications customEvents hash`](assert) {
    assert.expect(1);

    let MyApplication = Application.extend();

    MyApplication.initializer({
      name: 'customize-things',
      initialize(application) {
        application.customEvents = {
          wowza: 'wowza'
        };
      }
    });

    this.runTask(() => {
      this.createApplication({}, MyApplication);

      this.add('component:foo-bar', Component.extend({
        wowza() {
          assert.ok(true, 'fired the event!');
        }
      }));

      this.addTemplate('application', `{{foo-bar}}`);
      this.addTemplate('components/foo-bar', `<div id='wowza-thingy'></div>`);
    });

    this.$('#wowza-thingy').trigger('wowza');
  }

  [`@test instanceInitializers can augment an the customEvents hash`](assert) {
    assert.expect(1);

    let MyApplication = Application.extend();

    MyApplication.instanceInitializer({
      name: 'customize-things',
      initialize(application) {
        application.customEvents = {
          herky: 'jerky'
        };
      }
    });
    this.runTask(() => {
      this.createApplication({}, MyApplication);

      this.add('component:foo-bar', Component.extend({
        jerky() {
          assert.ok(true, 'fired the event!');
        }
      }));

      this.addTemplate('application', `{{foo-bar}}`);
      this.addTemplate('components/foo-bar', `<div id='herky-thingy'></div>`);
    });

    this.$('#herky-thingy').trigger('herky');
  }
});
