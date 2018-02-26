import {
  Controller,
  inject,
  String
} from 'ember-runtime';
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
  moduleFor('Router Service - isActive', class extends RouterTestCase {
    ['@test RouterService#isActive returns true for simple route'](assert) {
      assert.expect(1);

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          assert.ok(this.routerService.isActive('parent.sister'));
        });
    }

    ['@test RouterService#isActive returns true for simple route with dynamic segments'](assert) {
      assert.expect(1);

      let dynamicModel = { id: 1 };

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('dynamic', dynamicModel);
        })
        .then(() => {
          assert.ok(this.routerService.isActive('dynamic', dynamicModel));
        });
    }

    ['@test RouterService#isActive does not eagerly instantiate controller for query params'](assert) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ sort: 'ASC' });

      this.add('controller:parent.sister', Controller.extend({
        queryParams: ['sort'],
        sort: 'ASC',

        init() {
          assert.ok(false, 'should never create');
          this._super(...arguments);
        }
      }));

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.brother');
        })
        .then(() => {
          assert.notOk(this.routerService.isActive('parent.sister', queryParams));
        });
    }

    ['@test RouterService#isActive is correct for simple route with basic query params'](assert) {
      assert.expect(2);

      let queryParams = this.buildQueryParams({ sort: 'ASC' });

      this.add('controller:parent.child', Controller.extend({
        queryParams: ['sort'],
        sort: 'ASC'
      })
              );

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child', queryParams);
        })
        .then(() => {
          assert.ok(this.routerService.isActive('parent.child', queryParams));
          assert.notOk(this.routerService.isActive('parent.child', this.buildQueryParams({ sort: 'DESC' })));
        });
    }

    ['@test RouterService#isActive for simple route with array as query params'](assert) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ sort: ['ascending'] });

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child', queryParams);
        })
        .then(() => {
          assert.notOk(this.routerService.isActive('parent.child', this.buildQueryParams({ sort: 'descending' })));
        });
    }
  });
}
