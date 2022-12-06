import type { FullName, default as Owner } from '@ember/-internals/owner';

export function verifyRegistration(assert: QUnit['assert'], owner: Owner, fullName: FullName) {
  assert.ok(owner.factoryFor(fullName), `has registration: ${fullName}`);
}
