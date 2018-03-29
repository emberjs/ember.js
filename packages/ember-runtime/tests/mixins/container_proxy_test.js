import { OWNER } from 'ember-utils';
import { Container, Registry } from 'container';
import ContainerProxy from '../../mixins/container_proxy';
import EmberObject from '../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-runtime/mixins/container_proxy',
  class extends AbstractTestCase {
    beforeEach() {
      this.Owner = EmberObject.extend(ContainerProxy);
      this.instance = this.Owner.create();

      let registry = new Registry();

      this.instance.__container__ = new Container(registry, {
        owner: this.instance
      });
    }

    ['@test provides ownerInjection helper method'](assert) {
      let result = this.instance.ownerInjection();

      assert.equal(
        result[OWNER],
        this.instance,
        'returns an object with the OWNER symbol'
      );
    }
  }
);
