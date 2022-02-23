import { Owner } from '@ember/-internals/owner';

export function verifyRegistration(assert: QUnit['assert'], owner: Owner, fullName: string) {
  assert.ok(owner.resolveRegistration(fullName), `has registration: ${fullName}`);
}
