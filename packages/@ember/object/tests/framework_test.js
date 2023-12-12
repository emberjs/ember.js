import { getOwner } from '@ember/-internals/owner';
import { FrameworkObject } from '@ember/object/-internals';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'FrameworkObject',
  class extends RenderingTestCase {
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
      this.owner.register('model:blah', Model);

      this.owner.factoryFor('model:blah').create();
    }
  }
);
