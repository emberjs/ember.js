import { Route, NoneLocation } from '@ember/-internals/routing';
import { RouterTestCase, moduleFor, runLoopSettled } from 'internal-test-helpers';
import { InternalTransition as Transition } from 'router_js';
import Controller from '@ember/controller';

moduleFor(
  'Router Service - replaceWith',
  class extends RouterTestCase {
    constructor() {
      super(...arguments);

      let testCase = this;
      testCase.state = [];

      this.add(
        'location:test',
        NoneLocation.extend({
          setURL(path) {
            testCase.state.push(path);
            this.set('path', path);
          },

          replaceURL(path) {
            testCase.state.splice(testCase.state.length - 1, 1, path);
            this.set('path', path);
          },
        })
      );
    }

    get routerOptions() {
      return {
        location: 'test',
      };
    }

    ['@test RouterService#replaceWith returns a Transition'](assert) {
      assert.expect(1);

      let transition;

      return this.visit('/').then(() => {
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

    ['@test RouterService#replaceWith transitioning back to previously visited route replaces location'](
      assert
    ) {
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

    ['@test RouterService#replaceWith with basic query params removes query param defaults'](
      assert
    ) {
      assert.expect(1);

      this.add(
        'controller:parent.child',
        Controller.extend({
          queryParams: ['sort'],
          sort: 'ASC',
        })
      );

      let queryParams = this.buildQueryParams({ sort: 'ASC' });

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.brother');
        })
        .then(() => {
          return this.routerService.replaceWith('parent.sister');
        })
        .then(() => {
          return this.routerService.replaceWith('parent.child', queryParams);
        })
        .then(() => {
          assert.deepEqual(this.state, ['/', '/child']);
        });
    }

    async ['@test RouterService#replaceWith with `refreshModel: true` query param does not always refresh'](
      assert
    ) {
      assert.expect(3);

      let parentBeforeModelCount = 0;

      this.add(
        'route:parent',
        Route.extend({
          beforeModel() {
            parentBeforeModelCount++;
          },
          queryParams: {
            foo: {
              refreshModel: true,
            },
          },
        })
      );

      this.add(
        'controller:parent',
        Controller.extend({
          queryParams: ['foo'],
          foo: 'default',
        })
      );

      await this.visit('/child');

      assert.equal(parentBeforeModelCount, 1, 'parent.beforeModel called once');

      this.routerService.replaceWith('parent.sister');
      await runLoopSettled();

      assert.equal(this.routerService.get('currentURL'), '/sister', 'transitioned');
      assert.equal(parentBeforeModelCount, 1, 'parent.beforeModel still called only once');
    }
  }
);
