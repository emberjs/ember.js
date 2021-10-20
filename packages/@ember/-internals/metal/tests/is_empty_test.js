import { isEmpty } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import ObjectProxy from '../../runtime/lib/system/object_proxy';

moduleFor(
  'isEmpty',
  class extends AbstractTestCase {
    ['@test isEmpty'](assert) {
      let string = 'string';
      let fn = function () {};
      let object = { length: 0 };
      let proxy = ObjectProxy.create({ content: { size: 0 } });

      assert.strictEqual(true, isEmpty(null), 'for null');
      assert.strictEqual(true, isEmpty(undefined), 'for undefined');
      assert.strictEqual(true, isEmpty(''), 'for an empty String');
      assert.strictEqual(false, isEmpty('  '), 'for a whitespace String');
      assert.strictEqual(false, isEmpty('\n\t'), 'for another whitespace String');
      assert.strictEqual(false, isEmpty(true), 'for true');
      assert.strictEqual(false, isEmpty(false), 'for false');
      assert.strictEqual(false, isEmpty(string), 'for a String');
      assert.strictEqual(false, isEmpty(fn), 'for a Function');
      assert.strictEqual(false, isEmpty(0), 'for 0');
      assert.strictEqual(true, isEmpty([]), 'for an empty Array');
      assert.strictEqual(false, isEmpty({}), 'for an empty Object');
      assert.strictEqual(true, isEmpty(object), "for an Object that has zero 'length'");
      assert.strictEqual(true, isEmpty(proxy), "for a proxy that has zero 'size'");
    }
  }
);
