import { getOwner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import Service, { inject as injectService } from '@ember/service';
import { _ProxyMixin } from '@ember/-internals/runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { computed } from '@ember/-internals/metal';

moduleFor(
  'Service Injection',
  class extends ApplicationTestCase {
    async ['@test Service can be injected and is resolved'](assert) {
      this.add(
        'controller:application',
        Controller.extend({
          myService: injectService('my-service'),
        })
      );
      let MyService = Service.extend();
      this.add('service:my-service', MyService);
      this.addTemplate('application', '');

      await this.visit('/');

      let controller = this.applicationInstance.lookup('controller:application');
      assert.ok(controller.get('myService') instanceof MyService);
    }

    async ['@test Service can be an object proxy and access owner in init GH#16484'](assert) {
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

      let instance = await this.visit('/');

      let controller = this.applicationInstance.lookup('controller:application');
      assert.ok(controller.get('myService') instanceof MyService);
      assert.equal(serviceOwner, instance, 'should be able to `getOwner` in init');
    }
  }
);

moduleFor(
  'Service Injection with ES5 Getters',
  class extends ApplicationTestCase {
    async ['@test Service can be injected and is resolved without calling `get`'](assert) {
      this.add(
        'controller:application',
        Controller.extend({
          myService: injectService('my-service'),
        })
      );
      let MyService = Service.extend({
        name: computed(function () {
          return 'The service name';
        }),
      });
      this.add('service:my-service', MyService);
      this.addTemplate('application', '');

      await this.visit('/');

      let controller = this.applicationInstance.lookup('controller:application');
      assert.ok(controller.myService instanceof MyService);
      assert.equal(controller.myService.name, 'The service name', 'service property accessible');
    }
  }
);
