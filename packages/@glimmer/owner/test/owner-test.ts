import { getOwner, setOwner } from '..';

const { module, test } = QUnit;

module('Owner', () => {
  test('An owner can be set with `setOwner` and retrieved with `getOwner`', (assert) => {
    let owner = {};
    let obj = {};

    assert.strictEqual(getOwner(obj), undefined, 'owner has not been set');

    setOwner(obj, owner);

    assert.strictEqual(getOwner(obj), owner, 'owner has been set');
  });

  if (typeof Symbol !== 'undefined') {
    test('Setting the owner does not add an enumerable property in modern browsers', (assert) => {
      let owner = {};
      let obj = {};

      setOwner(obj, owner);

      assert.equal(Object.keys(obj).length, 0, 'no enumerable props were added');
    });
  }
});
