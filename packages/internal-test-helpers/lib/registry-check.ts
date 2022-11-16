import type { FullName, InternalOwner } from '@ember/-internals/owner';

export function verifyRegistration(
  assert: QUnit['assert'],
  owner: InternalOwner,
  fullName: FullName
) {
  assert.ok(owner.resolveRegistration(fullName), `has registration: ${fullName}`);
}
