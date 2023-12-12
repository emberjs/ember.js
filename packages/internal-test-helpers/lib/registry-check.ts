import type { FullName } from '@ember/-internals/owner';
import type Engine from '@ember/engine';

export function verifyRegistration(assert: QUnit['assert'], owner: Engine, fullName: FullName) {
  assert.ok(owner.resolveRegistration(fullName), `has registration: ${fullName}`);
}
