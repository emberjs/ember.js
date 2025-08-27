import Controller from '@ember/controller';
import { Component } from '@ember/-internals/glimmer';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import Service, { service } from '@ember/service';

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
        class extends Controller {
          queryParams = ['sort'];
          sort = 'ASC';

          init() {
            assert.ok(false, 'should never create');
            super.init(...arguments);
          }
        }
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
        class extends Controller {
          queryParams = ['sort'];
          sort = 'ASC';
        }
      );

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child', queryParams);
        })
        .then(() => {
          assert.ok(this.routerService.isActive('parent.child', queryParams), 'route is active');
          assert.notOk(
            this.routerService.isActive('parent.child', this.buildQueryParams({ sort: 'DESC' })),
            'route with QPs is not active'
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

    ['@test RouterService#isActive does not alter query params hash'](assert) {
      assert.expect(3);

      this.add(
        'controller:parent.child',
        class extends Controller {
          queryParams = ['sort', 'page'];
          sort = 'ASC';
          page = 1;
        }
      );

      let qp = this.buildQueryParams({ sort: 'ascending' });

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child', qp);
        })
        .then(() => {
          assert.ok(this.routerService.isActive('parent.child', qp));
          assert.ok(this.routerService.isActive('parent.child', qp)); // using same qp second time should not fail
          assert.deepEqual(qp.queryParams, { sort: 'ascending' });
        });
    }

    ['@test RouterService#isActive works reliably during component rendering before router initialization'](
      assert
    ) {
      assert.expect(1);

      // This simulates the scenario where isActive is called during component rendering
      // before the router has been fully set up, which used to throw an error

      let componentInstance;

      this.addTemplate('parent.index', '{{foo-component}}');

      this.addComponent('foo-component', {
        ComponentClass: class extends Component {
          @service('router')
          routerService;

          init() {
            super.init();
            componentInstance = this;
          }

          get isRouteActive() {
            // This used to throw "Cannot read properties of undefined (reading 'isActiveIntent')"
            // before setupRouter() was added to the isActive method
            return this.routerService.isActive('parent.child');
          }
        },
        template: `{{this.isRouteActive}}`,
      });

      return this.visit('/').then(() => {
        // The test passes if no error is thrown during rendering
        // and isActive returns a boolean value
        assert.strictEqual(
          typeof componentInstance.isRouteActive,
          'boolean',
          'isActive should return a boolean value without throwing an error'
        );
      });
    }
  }
);
