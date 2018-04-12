import { OWNER, getOwner, setOwner } from 'ember-owner';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Owner',
  class extends AbstractTestCase {
    ['@test An owner can be set with `setOwner` and retrieved with `getOwner`'](assert) {
      let owner = {};
      let obj = {};

      assert.strictEqual(getOwner(obj), undefined, 'owner has not been set');

      setOwner(obj, owner);

      assert.strictEqual(getOwner(obj), owner, 'owner has been set');

      assert.strictEqual(obj[OWNER], owner, 'owner has been set to the OWNER symbol');
    }
  }
);
