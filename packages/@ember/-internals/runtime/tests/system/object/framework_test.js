import { EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT } from '@ember/canary-features';
import { getOwner } from '@ember/-internals/owner';
import { FrameworkObject } from '../../../index';
import { moduleFor, AbstractRenderingTestCase } from 'internal-test-helpers';
import { setFrameworkClass } from '../../../lib/system/core_object';

if (EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT) {
  moduleFor(
    'FrameworkObject',
    class extends AbstractRenderingTestCase {
      ['@test tunnels the owner through to the base constructor for framework classes'](assert) {
        assert.expect(2);

        let testContext = this;
        class Model extends FrameworkObject {
          constructor(owner) {
            super(owner);

            assert.equal(
              getOwner(this),
              testContext.owner,
              'owner was assigned properly in the root constructor'
            );

            assert.equal(owner, testContext.owner, 'owner was passed properly to the constructor');
          }
        }
        setFrameworkClass(Model);
        this.owner.register('model:blah', Model);

        this.owner.factoryFor('model:blah').create();
      }
    }
  );
}
