import { EMBER_ARRAY, isEmberArray } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  '@ember/-internals/utils Trackable Object',
  class extends AbstractTestCase {
    ['@test classes'](assert) {
      class Test {}
      Test.prototype[EMBER_ARRAY] = true;

      let instance = new Test();

      assert.equal(isEmberArray(instance), true);
    }
  }
);
