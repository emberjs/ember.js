import { isNone } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'isNone',
  class extends AbstractTestCase {
    ['@test isNone'](assert) {
      let string = 'string';
      let fn = function () {};

      assert.strictEqual(true, isNone(null), 'for null');
      assert.strictEqual(true, isNone(undefined), 'for undefined');
      assert.strictEqual(false, isNone(''), 'for an empty String');
      assert.strictEqual(false, isNone(true), 'for true');
      assert.strictEqual(false, isNone(false), 'for false');
      assert.strictEqual(false, isNone(string), 'for a String');
      assert.strictEqual(false, isNone(fn), 'for a Function');
      assert.strictEqual(false, isNone(0), 'for 0');
      assert.strictEqual(false, isNone([]), 'for an empty Array');
      assert.strictEqual(false, isNone({}), 'for an empty Object');
    }
  }
);
