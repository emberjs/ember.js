import { getOwner, setOwner, OWNER } from 'ember-utils';

QUnit.module('Owner', {});

QUnit.test('An owner can be set with `setOwner` and retrieved with `getOwner`', function() {
  let owner = {};
  let obj = {};

  strictEqual(getOwner(obj), undefined, 'owner has not been set');

  setOwner(obj, owner);

  strictEqual(getOwner(obj), owner, 'owner has been set');

  strictEqual(obj[OWNER], owner, 'owner has been set to the OWNER symbol');
});
