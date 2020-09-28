import Controller from '@ember/controller';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import Service, { inject as service } from '@ember/service';

moduleFor(
  'Router Service - isActive',
  class extends RouterTestCase {
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

    async ['@test RouterService#isActive entangles with route transitions'](assert) {
      assert.expect(6);

      this.add(
        `service:foo`,
        class extends Service {
          @service router;

          get isChildActive() {
            return this.router.isActive('parent.child');
          }

          get isSisterActive() {
            return this.router.isActive('parent.sister');
          }
        }
      );

      await this.visit('/');

      let fooService = this.applicationInstance.lookup('service:foo');

      assert.equal(fooService.isChildActive, false);
      assert.equal(fooService.isSisterActive, false);

      await this.routerService.transitionTo('parent.child');

      assert.equal(fooService.isChildActive, true);
      assert.equal(fooService.isSisterActive, false);

      await this.routerService.transitionTo('parent.sister');

      assert.equal(fooService.isChildActive, false);
      assert.equal(fooService.isSisterActive, true);
    }

    ['@test RouterService#isActive does not eagerly instantiate controller for query params'](
      assert
    ) {
      assert.expect(1);

      let queryParams = this.buildQueryParams({ sort: 'ASC' });

      this.add(
        'controller:parent.sister',
        Controller.extend({
          queryParams: ['sort'],
          sort: 'ASC',

          init() {
            assert.ok(false, 'should never create');
            this._super(...arguments);
          },
        })
      );

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

      this.add(
        'controller:parent.child',
        Controller.extend({
          queryParams: ['sort'],
          sort: 'ASC',
        })
      );

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child', queryParams);
        })
        .then(() => {
          assert.ok(this.routerService.isActive('parent.child', queryParams));
          assert.notOk(
            this.routerService.isActive('parent.child', this.buildQueryParams({ sort: 'DESC' }))
          );
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
          assert.notOk(
            this.routerService.isActive(
              'parent.child',
              this.buildQueryParams({ sort: 'descending' })
            )
          );
        });
    }
  }
);
