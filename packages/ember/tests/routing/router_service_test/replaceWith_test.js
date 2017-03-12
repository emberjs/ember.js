import { NoneLocation } from 'ember-routing';
import {
  RouterTestCase,
  moduleFor
} from 'internal-test-helpers';
import { Transition } from 'router';

import { EMBER_ROUTING_ROUTER_SERVICE } from 'ember-features';

if (EMBER_ROUTING_ROUTER_SERVICE) {
  moduleFor('Router Service - replaceWith', class extends RouterTestCase {
    constructor() {
      super();

      let testCase = this;
      testCase.state = [];

      this.application.register('location:test', NoneLocation.extend({
        setURL(path) {
          testCase.state.push(path);
          this.set('path', path);
        },

        replaceURL(path) {
          testCase.state.splice(testCase.state.length -1, 1, path);
          this.set('path', path);
        }
      }));
    }

    get routerOptions() {
      return {
        location: 'test'
      };
    }

    ['@test RouterService#replaceWith returns a Transition'](assert) {
      assert.expect(1);

      let transition;

      return this.visit('/')
        .then(() => {
          transition = this.routerService.replaceWith('parent.child');

          assert.ok(transition instanceof Transition);

          return transition;
        });
    }

    ['@test RouterService#replaceWith with basic route replaces location'](assert) {
      assert.expect(1);

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          return this.routerService.replaceWith('parent.brother');
        })
        .then(() => {
          assert.deepEqual(this.state, ['/', '/child', '/brother']);
        });
    }

    ['@test RouterService#replaceWith with basic route using URLs replaces location'](assert) {
      assert.expect(1);

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('/child');
        })
        .then(() => {
          return this.routerService.transitionTo('/sister');
        })
        .then(() => {
          return this.routerService.replaceWith('/brother');
        })
        .then(() => {
          assert.deepEqual(this.state, ['/', '/child', '/brother']);
        });
    }

    ['@test RouterService#replaceWith transitioning back to previously visited route replaces location'](assert) {
      assert.expect(1);

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.brother');
        })
        .then(() => {
          return this.routerService.replaceWith('parent.sister');
        })
        .then(() => {
          assert.deepEqual(this.state, ['/', '/child', '/sister', '/sister']);
        });
    }
  });
}
