import { inject as injectService } from '@ember/service';
import { Router, NoneLocation } from '@ember/-internals/routing';
import { get } from '@ember/-internals/metal';
import { run } from '@ember/runloop';
import { Component } from '@ember/-internals/glimmer';
import { AbstractRenderingTestCase, moduleFor } from 'internal-test-helpers';
import { EMBER_ROUTING_ROUTER_SERVICE } from '@ember/canary-features';

moduleFor(
  'Router Service - non application',
  class extends AbstractRenderingTestCase {
    constructor() {
      super(...arguments);

      this.resolver.add('router:main', Router.extend(this.routerOptions));
      this.router.map(function() {
        this.route('parent', { path: '/' }, function() {
          this.route('child');
          this.route('sister');
          this.route('brother');
        });
        this.route('dynamic', { path: '/dynamic/:dynamic_id' });
        this.route('dynamicWithChild', { path: '/dynamic-with-child/:dynamic_id' }, function() {
          this.route('child', { path: '/:child_id' });
        });
      });
    }

    get routerOptions() {
      return {
        location: 'none',
      };
    }

    get router() {
      return this.owner.resolveRegistration('router:main');
    }

    get routerService() {
      return this.owner.lookup('service:router');
    }

    afterEach() {
      super.afterEach();
    }

    ['@test RouterService can be instantiated in non application test'](assert) {
      assert.ok(this.routerService);
    }

    ['@test RouterService properties can be accessed with default and should not start routing'](
      assert
    ) {
      assert.expect(EMBER_ROUTING_ROUTER_SERVICE ? 7 : 6);
      assert.equal(this.routerService.get('currentRouteName'), null);
      assert.equal(this.routerService.get('currentURL'), null);
      assert.equal(this.routerService.get('location'), 'none');
      assert.equal(this.routerService.get('rootURL'), '/');
      if (EMBER_ROUTING_ROUTER_SERVICE) {
        assert.equal(this.routerService.get('currentRoute'), null);
      }
      assert.notOk(this.routerService._didSetupRouter);
      this.routerService.router;
      assert.ok(this.routerService.get('location') instanceof NoneLocation);
    }

    ['@test RouterService#urlFor returns url'](assert) {
      assert.equal(this.routerService.urlFor('parent.child'), '/child');
    }

    ['@test RouterService#transitionTo with basic route'](assert) {
      assert.expect(2);

      let componentInstance;

      this.addTemplate('parent.index', '{{foo-bar}}');

      this.addComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: injectService('router'),
          init() {
            this._super(...arguments);
            componentInstance = this;
          },
          actions: {
            transitionToSister() {
              get(this, 'routerService').transitionTo('parent.sister');
            },
          },
        }),
        template: `foo-bar`,
      });

      this.render('{{foo-bar}}');

      run(function() {
        componentInstance.send('transitionToSister');
      });

      assert.equal(this.routerService.get('currentRouteName'), 'parent.sister');
      assert.ok(this.routerService.isActive('parent.sister'));
    }

    ['@test RouterService#recognize recognize returns routeInfo'](assert) {
      if (EMBER_ROUTING_ROUTER_SERVICE) {
        let routeInfo = this.routerService.recognize('/dynamic-with-child/123/1?a=b');
        assert.ok(routeInfo);
        let { name, localName, parent, child, params, queryParams, paramNames } = routeInfo;
        assert.equal(name, 'dynamicWithChild.child');
        assert.equal(localName, 'child');
        assert.ok(parent);
        assert.equal(parent.name, 'dynamicWithChild');
        assert.notOk(child);
        assert.deepEqual(params, { child_id: '1' });
        assert.deepEqual(queryParams, { a: 'b' });
        assert.deepEqual(paramNames, ['child_id']);
      }
    }
  }
);
