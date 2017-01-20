import Logger from 'ember-console';
import {
  Controller,
  inject
} from 'ember-runtime';
import { Component } from 'ember-glimmer';
import { Route, NoneLocation } from 'ember-routing';
import {
  run,
  get,
  set
} from 'ember-metal';
import { jQuery } from 'ember-views';
import {
  ApplicationTestCase,
  moduleFor
} from 'internal-test-helpers';

import { isFeatureEnabled } from 'ember-metal';

if (isFeatureEnabled('ember-routing-router-service')) {
  moduleFor('Router Service - main', class extends ApplicationTestCase {
    constructor() {
      super();

      this.router.map(function() {
        this.route('parent', { path: '/' }, function() {
          this.route('child');
          this.route('sister');
          this.route('brother');
        });
        this.route('dynamic', { path: '/dynamic/:post_id' });
      });
    }

    ['@test RouterService#currentRouteName is correctly set for top level route'](assert) {
      assert.expect(1);

      let routerService;

      this.registerRoute('parent.index', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      return this.visit('/').then(() => {
        assert.equal(routerService.get('currentRouteName'), 'parent.index');
      });
    }

    ['@test RouterService#currentRouteName is correctly set for child route'](assert) {
      assert.expect(1);

      let routerService;

      this.registerRoute('parent.child', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      return this.visit('/child').then(() => {
        assert.equal(routerService.get('currentRouteName'), 'parent.child');
      });
    }

    ['@test RouterService#currentRouteName is correctly set after transition'](assert) {
      assert.expect(1);

      let routerService;

      this.registerRoute('parent.child', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        },

        afterModel() {
          this.transitionTo('parent.sister');
        }
      }));

      return this.visit('/child').then(() => {
        assert.equal(routerService.get('currentRouteName'), 'parent.sister');
      });
    }

    ['@test RouterService#currentRouteName is correctly set on each transition'](assert) {
      assert.expect(3);

      let routerService;

      this.registerRoute('parent.child', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      return this.visit('/child')
        .then(() => {
          assert.equal(routerService.get('currentRouteName'), 'parent.child');

          return this.visit('/sister');
        })
        .then(() => {
          assert.equal(routerService.get('currentRouteName'), 'parent.sister');

          return this.visit('/brother');
        })
        .then(() => {
            assert.equal(routerService.get('currentRouteName'), 'parent.brother');
        });
    }

    ['@test RouterService#rootURL is correctly set to the default value'](assert) {
      assert.expect(1);

      let routerService;

      this.registerRoute('parent.index', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      return this.visit('/').then(() => {
        assert.equal(routerService.get('rootURL'), '/');
      });
    }

    ['@test RouterService#rootURL is correctly set to a custom value'](assert) {
      assert.expect(1);

      let routerService;

      this.registerRoute('parent.index', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          set(this.router, 'rootURL', '/homepage');
          routerService = get(this, 'routerService');
        }
      }));

      return this.visit('/').then(() => {
        assert.equal(routerService.get('rootURL'), '/homepage');
      });
    }

    ['@test RouterService#location is correctly delegated from router:main'](assert) {
      assert.expect(2);

      let routerService;

      this.registerRoute('parent.index', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      return this.visit('/').then(() => {
        let location = routerService.get('location');
        assert.ok(location);
        assert.ok(location instanceof NoneLocation);
      });
    }

    ['@test RouterService#transitionTo with basic route'](assert) {
      assert.expect(1);

      let routerService;
      let componentInstance;

      this.registerRoute('parent.index', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      this.registerTemplate('parent.index', '{{foo-bar}}');

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          init() {
            this._super();
            componentInstance = this;
          },
          actions: {
            transitionToSister() {
              get(this, 'routerService').transitionTo('parent.sister');
            }
          }
        }),
        template: `foo-bar`
      });

      return this.visit('/').then(() => {
        run(function() {
          componentInstance.send('transitionToSister');
        });

        assert.equal(routerService.get('currentRouteName'), 'parent.sister');
      });
    }

    ['@test RouterService#transitionTo with dynamic segment'](assert) {
      assert.expect(3);

      let routerService;
      let componentInstance;
      let dynamicModel = { id: 1, contents: 'much dynamicism' };

      this.registerRoute('parent.index', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      this.registerTemplate('parent.index', '{{foo-bar}}');
      this.registerTemplate('dynamic', '{{model.contents}}');

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          init() {
            this._super();
            componentInstance = this;
          },
          actions: {
            transitionToDynamic() {
              get(this, 'routerService').transitionTo('dynamic', dynamicModel);
            }
          }
        }),
        template: `foo-bar`
      });

      return this.visit('/').then(() => {
        run(function() {
          componentInstance.send('transitionToDynamic');
        });

        assert.equal(routerService.get('currentRouteName'), 'dynamic');
        assert.equal(routerService.get('currentURL'), '/dynamic/1');
        this.assertText('much dynamicism');
      });
    }

    ['@test RouterService#transitionTo with dynamic segment and model hook'](assert) {
      assert.expect(3);

      let routerService;
      let componentInstance;
      let dynamicModel = { id: 1, contents: 'much dynamicism' };

      this.registerRoute('parent.index', Route.extend({
        routerService: inject.service('router'),
        init() {
          this._super();
          routerService = get(this, 'routerService');
        }
      }));

      this.registerRoute('dynamic', Route.extend({
        model() {
          return dynamicModel;
        }
      }));

      this.registerTemplate('parent.index', '{{foo-bar}}');
      this.registerTemplate('dynamic', '{{model.contents}}');

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          init() {
            this._super();
            componentInstance = this;
          },
          actions: {
            transitionToDynamic() {
              get(this, 'routerService').transitionTo('dynamic', 1);
            }
          }
        }),
        template: `foo-bar`
      });

      return this.visit('/').then(() => {
        run(function() {
          componentInstance.send('transitionToDynamic');
        });

        assert.equal(routerService.get('currentRouteName'), 'dynamic');
        assert.equal(routerService.get('currentURL'), '/dynamic/1');
        this.assertText('much dynamicism');
      });
    }
  });
}
