import Controller from '@ember/controller';
import { capitalize } from '@ember/string';
import { Route } from '@ember/-internals/routing';
import { get } from '@ember/-internals/metal';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';

function setupController(app, name) {
  let controllerName = `${capitalize(name)}Controller`;

  Object.defineProperty(app, controllerName, {
    get() {
      throw new Error(`Generating a URL should not require instantiation of a ${controllerName}.`);
    },
  });
}

moduleFor(
  'Router Service - urlFor',
  class extends RouterTestCase {
    ['@test RouterService#urlFor returns URL for simple route'](assert) {
      assert.expect(1);

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child');

        assert.equal('/child', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with dynamic segments'](assert) {
      assert.expect(1);

      setupController(this.application, 'dynamic');

      let dynamicModel = { id: 1, contents: 'much dynamicism' };

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('dynamic', dynamicModel);

        assert.equal('/dynamic/1', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with basic query params'](assert) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ foo: 'bar' });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child', queryParams);

        assert.equal('/child?foo=bar', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with basic query params and default value'](
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

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child', queryParams);

        assert.equal('/child?sort=ASC', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with basic query params and default value with stickyness'](
      assert
    ) {
      assert.expect(2);

      this.add(
        'controller:parent.child',
        Controller.extend({
          queryParams: ['sort', 'foo'],
          sort: 'ASC',
        })
      );

      return this.visit('/child/?sort=DESC').then(() => {
        let controller = this.applicationInstance.lookup('controller:parent.child');
        assert.equal(get(controller, 'sort'), 'DESC', 'sticky is set');

        let queryParams = this.buildQueryParams({ foo: 'derp' });
        let actual = this.routerService.urlFor('parent.child', queryParams);

        assert.equal(actual, '/child?foo=derp', 'does not use "stickiness"');
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with array as query params'](assert) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({
        selectedItems: ['a', 'b', 'c'],
      });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child', queryParams);

        assert.equal('/child?selectedItems[]=a&selectedItems[]=b&selectedItems[]=c', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with null query params'](assert) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ foo: null });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child', queryParams);

        assert.equal('/child', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with undefined query params'](
      assert
    ) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ foo: undefined });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('parent.child', queryParams);

        assert.equal('/child', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with dynamic segments and basic query params'](
      assert
    ) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ foo: 'bar' });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('dynamic', { id: 1 }, queryParams);

        assert.equal('/dynamic/1?foo=bar', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with dynamic segments and array as query params'](
      assert
    ) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({
        selectedItems: ['a', 'b', 'c'],
      });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('dynamic', { id: 1 }, queryParams);

        assert.equal(
          '/dynamic/1?selectedItems[]=a&selectedItems[]=b&selectedItems[]=c',
          expectedURL
        );
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with dynamic segments and null query params'](
      assert
    ) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ foo: null });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('dynamic', { id: 1 }, queryParams);

        assert.equal('/dynamic/1', expectedURL);
      });
    }

    ['@test RouterService#urlFor returns URL for simple route with dynamic segments and undefined query params'](
      assert
    ) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ foo: undefined });

      return this.visit('/').then(() => {
        let expectedURL = this.routerService.urlFor('dynamic', { id: 1 }, queryParams);

        assert.equal('/dynamic/1', expectedURL);
      });
    }

    ['@test RouterService#urlFor correctly transitions to route via generated path'](assert) {
      assert.expect(1);

      let expectedURL;

      return this.visit('/')
        .then(() => {
          expectedURL = this.routerService.urlFor('parent.child');

          return this.routerService.transitionTo(expectedURL);
        })
        .then(() => {
          assert.equal(expectedURL, this.routerService.get('currentURL'));
        });
    }

    ['@test RouterService#urlFor correctly transitions to route via generated path with dynamic segments'](
      assert
    ) {
      assert.expect(1);

      let expectedURL;
      let dynamicModel = { id: 1 };

      this.add(
        'route:dynamic',
        Route.extend({
          model() {
            return dynamicModel;
          },
        })
      );

      return this.visit('/')
        .then(() => {
          expectedURL = this.routerService.urlFor('dynamic', dynamicModel);

          return this.routerService.transitionTo(expectedURL);
        })
        .then(() => {
          assert.equal(expectedURL, this.routerService.get('currentURL'));
        });
    }

    ['@test RouterService#urlFor correctly transitions to route via generated path with query params'](
      assert
    ) {
      assert.expect(1);

      let expectedURL;
      let actualURL;
      let queryParams = this.buildQueryParams({ foo: 'bar' });

      return this.visit('/')
        .then(() => {
          expectedURL = this.routerService.urlFor('parent.child', queryParams);

          return this.routerService.transitionTo(expectedURL);
        })
        .then(() => {
          actualURL = `${this.routerService.get('currentURL')}?foo=bar`;

          assert.equal(expectedURL, actualURL);
        });
    }

    ['@test RouterService#urlFor correctly transitions to route via generated path with dynamic segments and query params'](
      assert
    ) {
      assert.expect(1);

      let expectedURL;
      let actualURL;
      let queryParams = this.buildQueryParams({ foo: 'bar' });
      let dynamicModel = { id: 1 };

      this.add(
        'route:dynamic',
        Route.extend({
          model() {
            return dynamicModel;
          },
        })
      );

      return this.visit('/')
        .then(() => {
          expectedURL = this.routerService.urlFor('dynamic', dynamicModel, queryParams);

          return this.routerService.transitionTo(expectedURL);
        })
        .then(() => {
          actualURL = `${this.routerService.get('currentURL')}?foo=bar`;

          assert.equal(expectedURL, actualURL);
        });
    }
  }
);
