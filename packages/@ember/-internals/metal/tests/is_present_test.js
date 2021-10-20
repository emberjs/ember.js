import { isPresent } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'isPresent',
  class extends AbstractTestCase {
    ['@test isPresent'](assert) {
      let string = 'string';
      let fn = function () {};
      let object = { length: 0 };

      assert.strictEqual(false, isPresent(), 'for no params');
      assert.strictEqual(false, isPresent(null), 'for null');
      assert.strictEqual(false, isPresent(undefined), 'for undefined');
      assert.strictEqual(false, isPresent(''), 'for an empty String');
      assert.strictEqual(false, isPresent('  '), 'for a whitespace String');
      assert.strictEqual(false, isPresent('\n\t'), 'for another whitespace String');
      assert.strictEqual(true, isPresent('\n\t Hi'), 'for a String with whitespaces');
      assert.strictEqual(true, isPresent(true), 'for true');
      assert.strictEqual(true, isPresent(false), 'for false');
      assert.strictEqual(true, isPresent(string), 'for a String');
      assert.strictEqual(true, isPresent(fn), 'for a Function');
      assert.strictEqual(true, isPresent(0), 'for 0');
      assert.strictEqual(false, isPresent([]), 'for an empty Array');
      assert.strictEqual(true, isPresent({}), 'for an empty Object');
      assert.strictEqual(false, isPresent(object), "for an Object that has zero 'length'");
      assert.strictEqual(true, isPresent([1, 2, 3]), 'for a non-empty array');
    }
  }
);
