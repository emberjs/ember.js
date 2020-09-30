import { inject as injectService } from '@ember/service';
import { readOnly } from '@ember/object/computed';
import { Component } from '@ember/-internals/glimmer';
import { Route } from '@ember/-internals/routing';
import { get } from '@ember/-internals/metal';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import { RSVP } from '@ember/-internals/runtime';

let results = [];
let ROUTE_NAMES = ['index', 'child', 'sister', 'brother', 'loading'];

let InstrumentedRoute = Route.extend({
  routerService: injectService('router'),

  init() {
    this._super(...arguments);
    let service = get(this, 'routerService');
    service.on('routeWillChange', (transition) => {
      results.push([
        service.get('currentRouteName'),
        `${this.routeName} routeWillChange: ${transition.from && transition.from.name} - ${
          transition.to.name
        }`,
        service.get('currentURL'),
      ]);
    });
    service.on('routeDidChange', (transition) => {
      results.push([
        service.get('currentRouteName'),
        `${this.routeName} routeDidChange: ${transition.from && transition.from.name} - ${
          transition.to.name
        }`,
        service.get('currentURL'),
      ]);
    });
  },

  activate() {
    let service = get(this, 'routerService');
    results.push([
      service.get('currentRouteName'),
      `${this.routeName} activate`,
      service.get('currentURL'),
    ]);
  },

  redirect() {
    let service = get(this, 'routerService');
    results.push([
      service.get('currentRouteName'),
      `${this.routeName} redirect`,
      service.get('currentURL'),
    ]);
  },

  beforeModel() {
    let service = get(this, 'routerService');
    results.push([
      service.get('currentRouteName'),
      `${this.routeName} beforeModel`,
      service.get('currentURL'),
    ]);
  },

  model() {
    let service = get(this, 'routerService');
    results.push([
      service.get('currentRouteName'),
      `${this.routeName} model`,
      service.get('currentURL'),
    ]);
    return new RSVP.Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  },

  afterModel() {
    let service = get(this, 'routerService');
    results.push([
      service.get('currentRouteName'),
      `${this.routeName} afterModel`,
      service.get('currentURL'),
    ]);
  },

  actions: {
    willTransition(transition) {
      let service = get(this, 'routerService');
      results.push([
        service.get('currentRouteName'),
        `${this.routeName} willTransition: ${transition.from && transition.from.name} - ${
          transition.to.name
        }`,
        service.get('currentURL'),
      ]);
      return true;
    },
    didTransition() {
      let service = get(this, 'routerService');
      results.push([
        service.get('currentRouteName'),
        `${this.routeName} didTransition`,
        service.get('currentURL'),
      ]);
      return true;
    },
  },
});

moduleFor(
  'Router Service - currentURL | currentRouteName',
  class extends RouterTestCase {
    constructor() {
      super(...arguments);

      results = [];

      ROUTE_NAMES.forEach((name) => {
        let routeName = `parent.${name}`;
        this.add(`route:${routeName}`, InstrumentedRoute.extend());
        this.addTemplate(routeName, '{{current-url}}');
      });

      let CurrenURLComponent = Component.extend({
        routerService: injectService('router'),
        currentURL: readOnly('routerService.currentURL'),
        currentRouteName: readOnly('routerService.currentRouteName'),
        currentRoute: readOnly('routerService.currentRoute'),
      });

      this.addComponent('current-url', {
        ComponentClass: CurrenURLComponent,
        template: '{{currentURL}}-{{currentRouteName}}-{{currentRoute.name}}',
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

    ['@test RouterService#currentURL is not set during model lifecycle hooks until routeDidChange'](
      assert
    ) {
      assert.expect(2);

      return this.visit('/')
        .then(() => {
          assert.deepEqual(results, [
            [null, 'parent.index routeWillChange: null - parent.index', null],
            [null, 'parent.index beforeModel', null],
            [null, 'parent.index model', null],
            [null, 'parent.loading activate', null],
            [null, 'parent.loading routeWillChange: null - parent.loading', null],
            [null, 'parent.index routeWillChange: null - parent.loading', null],
            ['parent.loading', 'parent.index afterModel', '/'],
            ['parent.loading', 'parent.index redirect', '/'],
            ['parent.loading', 'parent.index activate', '/'],
            ['parent.loading', 'parent.index didTransition', '/'],
            ['parent.index', 'parent.loading routeDidChange: null - parent.index', '/'],
            ['parent.index', 'parent.index routeDidChange: null - parent.index', '/'],
          ]);

          results = [];

          return this.visit('/child');
        })
        .then(() => {
          assert.deepEqual(results, [
            ['parent.index', 'parent.index willTransition: parent.index - parent.child', '/'],
            ['parent.index', 'parent.child routeWillChange: parent.index - parent.child', '/'],
            ['parent.index', 'parent.loading routeWillChange: parent.index - parent.child', '/'],
            ['parent.index', 'parent.index routeWillChange: parent.index - parent.child', '/'],
            ['parent.index', 'parent.child beforeModel', '/'],
            ['parent.index', 'parent.child model', '/'],
            ['parent.index', 'parent.loading activate', '/'],
            ['parent.index', 'parent.child routeWillChange: parent.index - parent.loading', '/'],
            ['parent.index', 'parent.loading routeWillChange: parent.index - parent.loading', '/'],
            ['parent.index', 'parent.index routeWillChange: parent.index - parent.loading', '/'],
            ['parent.loading', 'parent.child afterModel', '/child'],
            ['parent.loading', 'parent.child redirect', '/child'],
            ['parent.loading', 'parent.child activate', '/child'],
            ['parent.loading', 'parent.child didTransition', '/child'],
            ['parent.child', 'parent.child routeDidChange: parent.index - parent.child', '/child'],
            [
              'parent.child',
              'parent.loading routeDidChange: parent.index - parent.child',
              '/child',
            ],
            ['parent.child', 'parent.index routeDidChange: parent.index - parent.child', '/child'],
          ]);
        });
    }

    ['@test RouterService#currentURL is correctly set with component after consecutive visits'](
      assert
    ) {
      assert.expect(3);

      return this.visit('/')
        .then(() => {
          this.assertText('/-parent.index-parent.index');

          return this.visit('/child');
        })
        .then(() => {
          this.assertText('/child-parent.child-parent.child');

          return this.visit('/');
        })
        .then(() => {
          this.assertText('/-parent.index-parent.index');
        });
    }
  }
);
