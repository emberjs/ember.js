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

import { isFeatureEnabled } from 'ember-metal';

function defineController(app, name) {
  let controllerName = `${String.capitalize(name)}Controller`;

  Object.defineProperty(app, controllerName, {
    get() {
      throw new Error(`Generating a URL should not require instantiation of a ${controllerName}.`);
    }
  });
}

if (isFeatureEnabled('ember-routing-router-service')) {
  moduleFor('Router Service - urlFor', class extends RouterTestCase {
    constructor() {
      super();

      ['dynamic', 'child']
        .forEach((name) => { defineController(this.application, name); });
    }

    ['@test RouterService#urlFor returns URL for simple route'](assert) {
      assert.expect(1);

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child');

        assert.equal('/child', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with dynamic segments'](assert) {
      assert.expect(1);

      let dynamicModel = { id: 1, contents: 'much dynamicism' };

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('dynamic', dynamicModel);

        assert.equal('/dynamic/1', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with query params'](assert) {
      assert.expect(1);

      let queryParams = { queryParams: { foo: 'bar' } };

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child', queryParams);

        assert.equal('/child?foo=bar', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with dynamic segments and query params'](assert) {
      assert.expect(1);

      let queryParams = { queryParams: { foo: 'bar' } };

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('dynamic', { id: 1 }, queryParams);

        assert.equal('/dynamic/1?foo=bar', expectedURL);
      });
    }
  });
}
