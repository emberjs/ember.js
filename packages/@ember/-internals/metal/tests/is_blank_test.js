import { isBlank } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'isBlank',
  class extends AbstractTestCase {
    ['@test isBlank'](assert) {
      let string = 'string';
      let fn = function () {};
      let object = { length: 0 };

      assert.strictEqual(true, isBlank(null), 'for null');
      assert.strictEqual(true, isBlank(undefined), 'for undefined');
      assert.strictEqual(true, isBlank(''), 'for an empty String');
      assert.strictEqual(true, isBlank('  '), 'for a whitespace String');
      assert.strictEqual(true, isBlank('\n\t'), 'for another whitespace String');
      assert.strictEqual(false, isBlank('\n\t Hi'), 'for a String with whitespaces');
      assert.strictEqual(false, isBlank(true), 'for true');
      assert.strictEqual(false, isBlank(false), 'for false');
      assert.strictEqual(false, isBlank(string), 'for a String');
      assert.strictEqual(false, isBlank(fn), 'for a Function');
      assert.strictEqual(false, isBlank(0), 'for 0');
      assert.strictEqual(true, isBlank([]), 'for an empty Array');
      assert.strictEqual(false, isBlank({}), 'for an empty Object');
      assert.strictEqual(true, isBlank(object), "for an Object that has zero 'length'");
      assert.strictEqual(false, isBlank([1, 2, 3]), 'for a non-empty array');
    }
  }
);
