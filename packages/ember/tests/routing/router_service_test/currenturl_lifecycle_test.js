import {
  inject,
  readOnly
} from 'ember-runtime';
import { Component } from 'ember-glimmer';
import { Route, NoneLocation } from 'ember-routing';
import { get } from 'ember-metal';
import {
  RouterTestCase,
  moduleFor
} from 'internal-test-helpers';

import { isFeatureEnabled } from 'ember-debug';

if (isFeatureEnabled('ember-routing-router-service')) {
  let results = [];
  let ROUTE_NAMES = ['index', 'child', 'sister', 'brother'];

  let InstrumentedRoute = Route.extend({
    routerService: inject.service('router'),

    beforeModel() {
      let service = get(this, 'routerService');
      results.push([service.get('currentRouteName'), 'beforeModel', service.get('currentURL')]);
    },

    model() {
      let service = get(this, 'routerService');
      results.push([service.get('currentRouteName'), 'model', service.get('currentURL')]);
    },

    afterModel() {
      let service = get(this, 'routerService');
      results.push([service.get('currentRouteName'), 'afterModel', service.get('currentURL')]);
    }
  });

  moduleFor('Router Service - currentURL', class extends RouterTestCase {
    constructor() {
      super();

      results = [];

      ROUTE_NAMES.forEach((name) => {
        let routeName = `parent.${name}`;
        this.add(`route:${routeName}`, InstrumentedRoute.extend());
        this.addTemplate(routeName, '{{current-url}}');
      });

      this.addComponent('current-url', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          currentURL: readOnly('routerService.currentURL')
        }),
        template: '{{currentURL}}'
      });
    }

    ['@test RouterService#currentURL is correctly set for top level route'](assert) {
      assert.expect(1);

      return this.visit('/').then(() => {
        assert.equal(this.routerService.get('currentURL'), '/');
      });
    }

    ['@test RouterService#currentURL is correctly set for child route'](assert) {
      assert.expect(1);

      return this.visit('/child').then(() => {
        assert.equal(this.routerService.get('currentURL'), '/child');
      });
    }

    ['@test RouterService#currentURL is correctly set after transition'](assert) {
      assert.expect(1);

      return this.visit('/child')
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          assert.equal(this.routerService.get('currentURL'), '/sister');
        });
    }

    ['@test RouterService#currentURL is correctly set on each transition'](assert) {
      assert.expect(3);

      return this.visit('/child')
        .then(() => {
          assert.equal(this.routerService.get('currentURL'), '/child');

          return this.visit('/sister');
        })
        .then(() => {
          assert.equal(this.routerService.get('currentURL'), '/sister');

          return this.visit('/brother');
        })
        .then(() => {
            assert.equal(this.routerService.get('currentURL'), '/brother');
        });
    }

    ['@test RouterService#currentURL is not set during lifecycle hooks'](assert) {
      assert.expect(2);

      return this.visit('/')
        .then(() => {
          assert.deepEqual(results, [
            [null, 'beforeModel', null],
            [null, 'model', null],
            [null, 'afterModel', null]
          ]);

          results = [];

          return this.visit('/child');
        })
        .then(() => {
          assert.deepEqual(results, [
            ['parent.index', 'beforeModel', '/'],
            ['parent.index', 'model', '/'],
            ['parent.index', 'afterModel', '/']
          ]);
        });
    }

    ['@test RouterService#currentURL is correctly set with component after consecutive visits'](assert) {
      assert.expect(3);

      return this.visit('/')
        .then(() => {
          this.assertText('/');

          return this.visit('/child');
        })
        .then(() => {
          this.assertText('/child');

          return this.visit('/');
        })
        .then(() => {
          this.assertText('/');
        });
    }
  });
}
