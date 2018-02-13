import { Controller } from 'ember-runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { inject, Service } from 'ember-runtime';
import { computed } from 'ember-metal';
import { EMBER_METAL_ES5_GETTERS, EMBER_MODULE_UNIFICATION } from 'ember/features';

moduleFor('Service Injection', class extends ApplicationTestCase {

  ['@test Service can be injected and is resolved'](assert) {
    this.add('controller:application', Controller.extend({
      myService: inject.service('my-service')
    }));
    let MyService = Service.extend();
    this.add('service:my-service', MyService);
    this.addTemplate('application', '');

    this.visit('/').then(() => {
      let controller = this.applicationInstance.lookup('controller:application');
      assert.ok(controller.get('myService') instanceof MyService);
    });
  }
});

if (EMBER_METAL_ES5_GETTERS) {
  moduleFor('Service Injection with ES5 Getters', class extends ApplicationTestCase {
    ['@test Service can be injected and is resolved without calling `get`'](assert) {
      this.add('controller:application', Controller.extend({
        myService: inject.service('my-service')
      }));
      let MyService = Service.extend({
        name: computed(function() {
          return 'The service name';
        })
      });
      this.add('service:my-service', MyService);
      this.addTemplate('application', '');

      this.visit('/').then(() => {
        let controller = this.applicationInstance.lookup('controller:application');
        assert.ok(controller.myService instanceof MyService);
        assert.equal(controller.myService.name, 'The service name', 'service property accessible');
      });
    }
  });
}

if (EMBER_MODULE_UNIFICATION) {
  moduleFor('Service Injection (MU)', class extends ApplicationTestCase {
    ['@test Service with namespace can be injected and is resolved'](assert) {
      this.add('controller:application', Controller.extend({
        myService: inject.service('my-namespace::my-service')
      }));
      let MyService = Service.extend();
      this.add({
        specifier: 'service:my-service',
        namespace: 'my-namespace'
      }, MyService);

      this.visit('/').then(() => {
        let controller = this.applicationInstance.lookup('controller:application');
        assert.ok(controller.get('myService') instanceof MyService);
      });
    }

    ['@test Service with namespace can be injected with namespace and is resolved'](assert) {
      let namespace = 'my-namespace';
      this.add('controller:application', Controller.extend({
        myService: inject.service('my-service', { namespace })
      }));
      let MyService = Service.extend();
      this.add({
        specifier: 'service:my-service',
        namespace
      }, MyService);

      this.visit('/').then(() => {
        let controller = this.applicationInstance.lookup('controller:application');

        assert.ok(controller.get('myService') instanceof MyService);
      });
    }
  });
}
