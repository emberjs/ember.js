import { isBlank } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'isBlank',
  class extends AbstractTestCase {
    ['@test isBlank'](assert) {
      let string = 'string';
      let fn = function() {};
      let object = { length: 0 };

      assert.equal(true, isBlank(null), 'for null');
      assert.equal(true, isBlank(undefined), 'for undefined');
      assert.equal(true, isBlank(''), 'for an empty String');
      assert.equal(true, isBlank('  '), 'for a whitespace String');
      assert.equal(true, isBlank('\n\t'), 'for another whitespace String');
      assert.equal(false, isBlank('\n\t Hi'), 'for a String with whitespaces');
      assert.equal(false, isBlank(true), 'for true');
      assert.equal(false, isBlank(false), 'for false');
      assert.equal(false, isBlank(string), 'for a String');
      assert.equal(false, isBlank(fn), 'for a Function');
      assert.equal(false, isBlank(0), 'for 0');
      assert.equal(true, isBlank([]), 'for an empty Array');
      assert.equal(false, isBlank({}), 'for an empty Object');
      assert.equal(
        true,
        isBlank(object),
        "for an Object that has zero 'length'"
      );
      assert.equal(false, isBlank([1, 2, 3]), 'for a non-empty array');
    }
  }
);
