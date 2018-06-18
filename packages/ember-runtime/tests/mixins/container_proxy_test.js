import { OWNER, getOwner } from 'ember-owner';
import { Container, Registry } from 'container';
import ContainerProxy from '../../lib/mixins/container_proxy';
import EmberObject from '../../lib/system/object';
import { run, schedule } from '@ember/runloop';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-runtime/mixins/container_proxy',
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

      assert.equal(result[OWNER], this.instance, 'returns an object with the OWNER symbol');
    }

    ["@test actions queue completes before destruction"](assert) {
      assert.expect(1);

      this.registry.register('service:auth', EmberObject.extend({
        willDestroy() {
          assert.ok(getOwner(this).lookup('service:auth'), 'can still lookup');
        }
      }));

      let service = this.instance.lookup('service:auth');

      run(() => {
        schedule('actions', service, 'destroy');
        this.instance.destroy();
      });
    }
  }
);
