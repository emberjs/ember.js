import { tryInvoke } from '..';
import {
  moduleFor,
  AbstractTestCase as TestCase
} from 'internal-test-helpers';

let obj;

moduleFor('Ember.tryInvoke', class extends TestCase {
  constructor() {
    super();

    obj = {
      aMethodThatExists() { return true; },
      aMethodThatTakesArguments(arg1, arg2) { return arg1 === arg2; }
    };
  }

  teardown() {
    obj = undefined;
  }

  ['@test should return undefined when the object doesn\'t exist'](assert) {
    assert.equal(tryInvoke(undefined, 'aMethodThatDoesNotExist'), undefined);
  }

  ['@test should return undefined when asked to perform a method that doesn\'t exist on the object'](assert) {
    assert.equal(tryInvoke(obj, 'aMethodThatDoesNotExist'), undefined);
  }

  ['@test should return what the method returns when asked to perform a method that exists on the object'](assert) {
    assert.equal(tryInvoke(obj, 'aMethodThatExists'), true);
  }

  ['@test should return what the method returns when asked to perform a method that takes arguments and exists on the object'](assert) {
    assert.equal(tryInvoke(obj, 'aMethodThatTakesArguments', [true, true]), true);
  }
});

