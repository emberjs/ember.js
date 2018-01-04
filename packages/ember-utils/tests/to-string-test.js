import { toString } from '..';
import {
  moduleFor,
  AbstractTestCase as TestCase
} from 'internal-test-helpers';

moduleFor('ember-utils toString', class extends TestCase {
  [`@test toString uses an object's toString method when available`](assert) {
    let obj = {
      toString() {
        return 'bob';
      }
    };

    assert.strictEqual(toString(obj), 'bob');
  }

  ['@test toString falls back to Object.prototype.toString'](assert) {
    let obj = Object.create(null);

    assert.strictEqual(toString(obj), {}.toString());
  }

  ['@test toString does not fail when called on Arrays with objects without toString method'](assert) {
    let obj = Object.create(null);
    let arr = [obj, 2];

    assert.strictEqual(toString(arr), `${({}).toString()},2`);
  }
});
