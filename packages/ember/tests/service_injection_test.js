import { getOwner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import Service, { service } from '@ember/service';
import { _ProxyMixin } from '@ember/-internals/runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { computed } from '@ember/object';

moduleFor(
  'Service Injection',
  class extends ApplicationTestCase {
    async ['@test Service can be injected and is resolved'](assert) {
      this.add(
        'controller:application',
        class extends Controller {
          @service('my-service')
          myService;
        }
      );
      let MyService = class extends Service {};
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
        class extends Controller {
          @service('my-service')
          myService;
        }
      );
      let MyService = class extends Service.extend(_ProxyMixin) {
        init() {
          super.init(...arguments);

          serviceOwner = getOwner(this);
        }
      };
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
        class extends Controller {
          @service('my-service')
          myService;
        }
      );
      let MyService = class extends Service {
        @computed
        get name() {
          return 'The service name';
        }
      };
      this.add('service:my-service', MyService);
      this.addTemplate('application', '');

      await this.visit('/');

      let controller = this.applicationInstance.lookup('controller:application');
      assert.ok(controller.myService instanceof MyService);
      assert.equal(controller.myService.name, 'The service name', 'service property accessible');
    }
  }
);
