import Service, { service } from '@ember/service';
import EmberObject from '@ember/object/lib/ember-object';
import { getOwner } from '@ember/owner';
import { isDestroyed, registerDestructor } from '@ember/destroyable';
import {
  buildOwner,
  moduleFor,
  runDestroy,
  runTask,
  AbstractTestCase,
} from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: Service',
    class extends AbstractTestCase {
      ['@test Service extends no other class'](assert) {
        assert.strictEqual(Object.getPrototypeOf(Service), Function.prototype);
        assert.strictEqual(Object.getPrototypeOf(Service.prototype), Object.prototype);
      }

      ['@test the owner passes itself to the constructor'](assert) {
        let owner = buildOwner();

        class MainService extends Service {
          constructor(owner) {
            super(owner);
            assert.step('constructor');
            assert.strictEqual(getOwner(this), owner, 'the owner is set in the constructor');
          }
        }

        owner.register('service:main', MainService);

        let main = owner.lookup('service:main');

        assert.verifySteps(['constructor']);
        assert.ok(main instanceof MainService);
        assert.notOk(main instanceof EmberObject);
        assert.strictEqual(owner.lookup('service:main'), main, 'the service is a singleton');

        runDestroy(owner);
      }

      ['@test services inject other services'](assert) {
        let owner = buildOwner();

        class SessionService extends Service {}

        class MainService extends Service {
          @service session;
        }

        owner.register('service:session', SessionService);
        owner.register('service:main', MainService);

        let main = owner.lookup('service:main');

        assert.strictEqual(main.session, owner.lookup('service:session'));

        runDestroy(owner);
      }

      ['@test willDestroy runs once when the owner is destroyed'](assert) {
        let owner = buildOwner();

        class MainService extends Service {
          constructor(owner) {
            super(owner);
            registerDestructor(this, () => assert.step('destructor'));
          }

          willDestroy() {
            super.willDestroy(...arguments);
            assert.step('willDestroy');
          }
        }

        owner.register('service:main', MainService);

        let main = owner.lookup('service:main');

        assert.verifySteps([]);

        runDestroy(owner);

        assert.verifySteps(['willDestroy', 'destructor']);
        assert.true(isDestroyed(main));
      }

      ['@test a service has no destroy method'](assert) {
        let owner = buildOwner();

        owner.register('service:main', class extends Service {});

        assert.false('destroy' in owner.lookup('service:main'));

        runDestroy(owner);
      }

      ['@test unregister runs willDestroy, then destroys the service'](assert) {
        let owner = buildOwner();

        class MainService extends Service {
          constructor(owner) {
            super(owner);
            registerDestructor(this, () => assert.step('destructor'));
          }

          willDestroy() {
            assert.step('willDestroy');
          }
        }

        owner.register('service:main', MainService);

        let main = owner.lookup('service:main');

        runTask(() => owner.unregister('service:main'));

        assert.verifySteps(['willDestroy', 'destructor']);
        assert.true(isDestroyed(main));

        runDestroy(owner);

        assert.verifySteps([]);
      }

      ['@test a service without willDestroy is destroyed with its owner'](assert) {
        let owner = buildOwner();

        class MainService extends Service {
          constructor(owner) {
            super(owner);
            registerDestructor(this, () => assert.step('destructor'));
          }
        }

        owner.register('service:main', MainService);

        let main = owner.lookup('service:main');

        runDestroy(owner);

        assert.verifySteps(['destructor']);
        assert.true(isDestroyed(main));
      }
    }
  );
}
