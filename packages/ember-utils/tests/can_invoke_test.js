import { canInvoke } from '..';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

let obj;

moduleFor(
  'Ember.canInvoke',
  class extends TestCase {
    constructor() {
      super();

      obj = {
        foobar: 'foobar',
        aMethodThatExists() {}
      };
    }

    teardown() {
      obj = undefined;
    }

    ["@test should return false if the object doesn't exist"](assert) {
      assert.equal(canInvoke(undefined, 'aMethodThatDoesNotExist'), false);
    }

    ['@test should return true for falsy values that have methods'](assert) {
      assert.equal(canInvoke(false, 'valueOf'), true);
      assert.equal(canInvoke('', 'charAt'), true);
      assert.equal(canInvoke(0, 'toFixed'), true);
    }

    ['@test should return true if the method exists on the object'](assert) {
      assert.equal(canInvoke(obj, 'aMethodThatExists'), true);
    }

    ["@test should return false if the method doesn't exist on the object"](
      assert
    ) {
      assert.equal(canInvoke(obj, 'aMethodThatDoesNotExist'), false);
    }

    ['@test should return false if the property exists on the object but is a non-function'](
      assert
    ) {
      assert.equal(canInvoke(obj, 'foobar'), false);
    }
  }
);
