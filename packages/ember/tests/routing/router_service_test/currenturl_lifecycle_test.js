import { inject as injectService } from '@ember/service';
import { readOnly } from '@ember/object/computed';
import { Component } from '@ember/-internals/glimmer';
import { Route } from '@ember/-internals/routing';
import { get } from '@ember/-internals/metal';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import { RSVP } from '@ember/-internals/runtime';
import { EMBER_ROUTING_ROUTER_SERVICE } from '@ember/canary-features';

let results = [];
let ROUTE_NAMES = ['index', 'child', 'sister', 'brother', 'loading'];

let InstrumentedRoute = Route.extend({
  routerService: injectService('router'),

  beforeModel() {
    let service = get(this, 'routerService');
    results.push([service.get('currentRouteName'), 'beforeModel', service.get('currentURL')]);
  },

  model() {
    let service = get(this, 'routerService');
    results.push([service.get('currentRouteName'), 'model', service.get('currentURL')]);
    return new RSVP.Promise(resolve => {
      setTimeout(resolve, 200);
    });
  },

  afterModel() {
    let service = get(this, 'routerService');
    results.push([service.get('currentRouteName'), 'afterModel', service.get('currentURL')]);
  },
});

moduleFor(
  'Router Service - currentURL | currentRouteName',
  class extends RouterTestCase {
    constructor() {
      super(...arguments);

      results = [];

      ROUTE_NAMES.forEach(name => {
        let routeName = `parent.${name}`;
        this.add(`route:${routeName}`, InstrumentedRoute.extend());
        this.addTemplate(routeName, '{{current-url}}');
      });

      let CurrenURLComponent = Component.extend({
        routerService: injectService('router'),
        currentURL: readOnly('routerService.currentURL'),
        currentRouteName: readOnly('routerService.currentRouteName'),
      });

      if (EMBER_ROUTING_ROUTER_SERVICE) {
        CurrenURLComponent.reopen({
          currentRoute: readOnly('routerService.currentRoute'),
        });
      }

      this.addComponent('current-url', {
        ComponentClass: CurrenURLComponent,
        template: EMBER_ROUTING_ROUTER_SERVICE
          ? '{{currentURL}}-{{currentRouteName}}-{{currentRoute.name}}'
          : '{{currentURL}}-{{currentRouteName}}',
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
            ['parent.loading', 'afterModel', '/'],
          ]);

          results = [];

          return this.visit('/child');
        })
        .then(() => {
          assert.deepEqual(results, [
            ['parent.index', 'beforeModel', '/'],
            ['parent.index', 'model', '/'],
            ['parent.loading', 'afterModel', '/child'],
          ]);
        });
    }

    ['@test RouterService#currentURL is correctly set with component after consecutive visits'](
      assert
    ) {
      assert.expect(3);

      return this.visit('/')
        .then(() => {
          let text = '/-parent.index';
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            text = '/-parent.index-parent.index';
          }
          this.assertText(text);

          return this.visit('/child');
        })
        .then(() => {
          let text = '/child-parent.child';
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            text = '/child-parent.child-parent.child';
          }
          this.assertText(text);

          return this.visit('/');
        })
        .then(() => {
          let text = '/-parent.index';
          if (EMBER_ROUTING_ROUTER_SERVICE) {
            text = '/-parent.index-parent.index';
          }
          this.assertText(text);
        });
    }
  }
);
