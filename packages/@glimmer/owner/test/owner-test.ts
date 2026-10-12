import { enterOwnerScope, exitOwnerScope, getOwner, setOwner } from '@glimmer/owner';

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

      assert.strictEqual(Object.keys(obj).length, 0, 'no enumerable props were added');
    });
  }

  test('`getOwner()` throws when no owner scope is active', (assert) => {
    assert.throws(() => getOwner(), /there is no active owner/u);
  });

  test('`getOwner()` returns the owner of the active scope', (assert) => {
    let outer = {};
    let inner = {};

    let beforeOuter = enterOwnerScope(outer);

    assert.strictEqual(getOwner(), outer, 'the outer scope is active');

    let beforeInner = enterOwnerScope(inner);

    assert.strictEqual(getOwner(), inner, 'the inner scope is active');

    exitOwnerScope(beforeInner);

    assert.strictEqual(getOwner(), outer, 'the outer scope is active again');

    exitOwnerScope(beforeOuter);

    assert.throws(() => getOwner(), /there is no active owner/u);
  });

  test('`getOwner()` returns `undefined` in a scope without an owner', (assert) => {
    let previous = enterOwnerScope(undefined);

    assert.strictEqual(getOwner(), undefined);

    exitOwnerScope(previous);
  });
});
