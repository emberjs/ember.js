import { getOwner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import Service, { inject as injectService } from '@ember/service';
import { _ProxyMixin } from 'ember-runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { computed } from 'ember-metal';
import { EMBER_MODULE_UNIFICATION } from '@ember/canary-features';

moduleFor(
  'Service Injection',
  class extends ApplicationTestCase {
    ['@test Service can be injected and is resolved'](assert) {
      this.add(
        'controller:application',
        Controller.extend({
          myService: injectService('my-service'),
        })
      );
      let MyService = Service.extend();
      this.add('service:my-service', MyService);
      this.addTemplate('application', '');

      this.visit('/').then(() => {
        let controller = this.applicationInstance.lookup('controller:application');
        assert.ok(controller.get('myService') instanceof MyService);
      });
    }

    ['@test Service can be an object proxy and access owner in init GH#16484'](assert) {
      let serviceOwner;

      this.add(
        'controller:application',
        Controller.extend({
          myService: injectService('my-service'),
        })
      );
      let MyService = Service.extend(_ProxyMixin, {
        init() {
          this._super(...arguments);

          serviceOwner = getOwner(this);
        },
      });
      this.add('service:my-service', MyService);
      this.addTemplate('application', '');

      this.visit('/').then(instance => {
        let controller = this.applicationInstance.lookup('controller:application');
        assert.ok(controller.get('myService') instanceof MyService);
        assert.equal(serviceOwner, instance, 'should be able to `getOwner` in init');
      });
    }
  }
);

moduleFor(
  'Service Injection with ES5 Getters',
  class extends ApplicationTestCase {
    ['@test Service can be injected and is resolved without calling `get`'](assert) {
      this.add(
        'controller:application',
        Controller.extend({
          myService: injectService('my-service'),
        })
      );
      let MyService = Service.extend({
        name: computed(function() {
          return 'The service name';
        }),
      });
      this.add('service:my-service', MyService);
      this.addTemplate('application', '');

      this.visit('/').then(() => {
        let controller = this.applicationInstance.lookup('controller:application');
        assert.ok(controller.myService instanceof MyService);
        assert.equal(controller.myService.name, 'The service name', 'service property accessible');
      });
    }
  }
);

if (EMBER_MODULE_UNIFICATION) {
  moduleFor(
    'Service Injection (MU)',
    class extends ApplicationTestCase {
      ['@test Service can be injected with source and is resolved'](assert) {
        let source = 'controller:src/ui/routes/application/controller';
        this.add(
          'controller:application',
          Controller.extend({
            myService: injectService('my-service', { source }),
          })
        );
        let MyService = Service.extend();
        this.add(
          {
            specifier: 'service:my-service',
            source,
          },
          MyService
        );

        return this.visit('/').then(() => {
          let controller = this.applicationInstance.lookup('controller:application');

          assert.ok(controller.get('myService') instanceof MyService);
        });
      }

      ['@test Services can be injected with same name, different source, and resolve different instances'](
        assert
      ) {
        // This test implies that there is a file src/ui/routes/route-a/-services/my-service
        let routeASource = 'controller:src/ui/routes/route-a/controller';
        // This test implies that there is a file src/ui/routes/route-b/-services/my-service
        let routeBSource = 'controller:src/ui/routes/route-b/controller';

        this.add(
          'controller:route-a',
          Controller.extend({
            myService: injectService('my-service', { source: routeASource }),
          })
        );

        this.add(
          'controller:route-b',
          Controller.extend({
            myService: injectService('my-service', { source: routeBSource }),
          })
        );

        let LocalLookupService = Service.extend();
        this.add(
          {
            specifier: 'service:my-service',
            source: routeASource,
          },
          LocalLookupService
        );

        let MyService = Service.extend();
        this.add(
          {
            specifier: 'service:my-service',
            source: routeBSource,
          },
          MyService
        );

        return this.visit('/').then(() => {
          let controllerA = this.applicationInstance.lookup('controller:route-a');
          let serviceFromControllerA = controllerA.get('myService');
          assert.ok(
            serviceFromControllerA instanceof LocalLookupService,
            'local lookup service is returned'
          );

          let controllerB = this.applicationInstance.lookup('controller:route-b');
          let serviceFromControllerB = controllerB.get('myService');
          assert.ok(serviceFromControllerB instanceof MyService, 'global service is returned');

          assert.notStrictEqual(serviceFromControllerA, serviceFromControllerB);
        });
      }

      ['@test Services can be injected with same name, different source, but same resolution result, and share an instance'](
        assert
      ) {
        let routeASource = 'controller:src/ui/routes/route-a/controller';
        let routeBSource = 'controller:src/ui/routes/route-b/controller';

        this.add(
          'controller:route-a',
          Controller.extend({
            myService: injectService('my-service', { source: routeASource }),
          })
        );

        this.add(
          'controller:route-b',
          Controller.extend({
            myService: injectService('my-service', { source: routeBSource }),
          })
        );

        let MyService = Service.extend();
        this.add(
          {
            specifier: 'service:my-service',
          },
          MyService
        );

        return this.visit('/').then(() => {
          let controllerA = this.applicationInstance.lookup('controller:route-a');
          let serviceFromControllerA = controllerA.get('myService');
          assert.ok(serviceFromControllerA instanceof MyService);

          let controllerB = this.applicationInstance.lookup('controller:route-b');
          assert.strictEqual(serviceFromControllerA, controllerB.get('myService'));
        });
      }

      /*
     * This test demonstrates a failure in the caching system of ember's
     * container around singletons and and local lookup. The local lookup
     * is cached and the global injection is then looked up incorrectly.
     *
     * The paractical rules of Ember's module unification config are such
     * that services cannot be locally looked up, thus this case is really
     * just a demonstration of what could go wrong if we permit arbitrary
     * configuration (such as a singleton type that has local lookup).
     */
      ['@test Services can be injected with same name, one with source one without, and share an instance'](
        assert
      ) {
        let routeASource = 'controller:src/ui/routes/route-a/controller';
        this.add(
          'controller:route-a',
          Controller.extend({
            myService: injectService('my-service', { source: routeASource }),
          })
        );

        this.add(
          'controller:route-b',
          Controller.extend({
            myService: injectService('my-service'),
          })
        );

        let MyService = Service.extend();
        this.add(
          {
            specifier: 'service:my-service',
          },
          MyService
        );

        return this.visit('/').then(() => {
          let controllerA = this.applicationInstance.lookup('controller:route-a');
          let serviceFromControllerA = controllerA.get('myService');
          assert.ok(serviceFromControllerA instanceof MyService, 'global service is returned');

          let controllerB = this.applicationInstance.lookup('controller:route-b');
          let serviceFromControllerB = controllerB.get('myService');
          assert.ok(serviceFromControllerB instanceof MyService, 'global service is returned');

          assert.strictEqual(serviceFromControllerA, serviceFromControllerB);
        });
      }

      ['@test Service with namespace can be injected and is resolved'](assert) {
        this.add(
          'controller:application',
          Controller.extend({
            myService: injectService('my-namespace::my-service'),
          })
        );
        let MyService = Service.extend();
        this.add(
          {
            specifier: 'service:my-service',
            namespace: 'my-namespace',
          },
          MyService
        );

        this.visit('/').then(() => {
          let controller = this.applicationInstance.lookup('controller:application');
          assert.ok(controller.get('myService') instanceof MyService);
        });
      }
    }
  );
}
