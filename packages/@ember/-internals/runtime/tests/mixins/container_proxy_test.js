import { getOwner } from '@ember/-internals/owner';
import { Container, Registry } from '@ember/-internals/container';
import ContainerProxy from '../../lib/mixins/container_proxy';
import EmberObject from '../../lib/system/object';
import { run, schedule } from '@ember/runloop';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { destroy } from '@glimmer/destroyable';

moduleFor(
  '@ember/-internals/runtime/mixins/container_proxy',
  class extends AbstractTestCase {
    beforeEach() {
      this.Owner = EmberObject.extend(ContainerProxy);
      this.instance = this.Owner.create();

      this.registry = new Registry();

      this.instance.__container__ = new Container(this.registry, {
        owner: this.instance,
      });
    }

    ['@test provides ownerInjection helper method'](assert) {
      let result = this.instance.ownerInjection();

      assert.equal(getOwner(result), this.instance, 'returns an object with an associated owner');
    }

    ['@test actions queue completes before destruction'](assert) {
      assert.expect(1);

      this.registry.register(
        'service:auth',
        EmberObject.extend({
          willDestroy() {
            assert.ok(getOwner(this).lookup('service:auth'), 'can still lookup');
          },
        })
      );

      let service = this.instance.lookup('service:auth');

      run(() => {
        schedule('actions', service, 'destroy');
        this.instance.destroy();
      });
    }

    '@test being destroyed by @ember/destroyable properly destroys the container and created instances'(
      assert
    ) {
      assert.expect(1);

      this.registry.register(
        'service:foo',
        class FooService extends EmberObject {
          willDestroy() {
            assert.ok(true, 'is properly destroyed');
          }
        }
      );

      this.instance.lookup('service:foo');

      run(() => {
        destroy(this.instance);
      });
    }
  }
);
